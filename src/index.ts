// Validate env before any other import touches process.env.
import './config/env';

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

import { env } from './config/env';
import { loadConfig } from './config';
import { routeMessage, setSendFn } from './router';
import { setReminderSendFn } from './reminders';
import { createRouter } from './api/routes';
import {
  getUser,
  activateUser,
  isTrialExpired,
  checkRateLimit,
  recordMessage,
  isKeyValid,
  createKey,
  listKeys,
  listUsersWithKeys,
  deleteUser,
  extendTrial,
} from './users';

const logger = pino({ level: 'info' });

const app = express();
app.use(express.json());

// AUTH_DIR can be overridden so the Railway Volume mount path can differ from local dev.
const AUTH_DIR = process.env.AUTH_DIR ?? 'auth_info_baileys';

let sock: WASocket | null = null;
let connectionStatus: 'connected' | 'disconnected' = 'disconnected';

// Parsed once — used in the hot path for every inbound message.
// First whitelisted number is treated as the admin — receives alerts about
// unauthorized senders and can run admin commands (/generate-key, /users, etc).
const adminNumber = env.ALLOWED_NUMBERS.split(',').map((n) => n.trim())[0];

async function handleAdminCommand(from: string, text: string): Promise<boolean> {
  const trimmed = text.trim();
  const send = sendMessage;

  // /generate-key <name> — name required, single word (letters, numbers, - or _)
  const genMatch = trimmed.match(/^\/generate-key\s+(\S+)$/i);
  if (genMatch) {
    const name = genMatch[1];
    try {
      const { code } = await createKey(name);
      await send(from, `Generated invite key: \`${code}\`\nSaved as: ${name}\nShare it with a friend. All services included, trial starts on first use.`);
    } catch (e: any) {
      await send(from, e.message);
    }
    return true;
  }

  // /keys — list all keys with status
  if (/^\/keys$/i.test(trimmed)) {
    const keys = await listKeys();
    if (keys.length === 0) {
      await send(from, 'No keys yet.');
      return true;
    }
    const lines = keys.map((k) => {
      const status = k.used ? `USED (by ${k.usedBy ?? '?'})` : 'available';
      const usedAt = k.usedAt ? ` @ ${k.usedAt.toISOString().split('T')[0]}` : '';
      return `• ${k.name} | ${k.code} | ${status}${usedAt}`;
    });
    await send(from, `*Keys (${keys.length})*\n${lines.join('\n')}`);
    return true;
  }

  // /users — list all users with their key name
  if (/^\/users$/i.test(trimmed)) {
    const users = await listUsersWithKeys();
    if (users.length === 0) {
      await send(from, 'No users yet.');
      return true;
    }
    const lines = users.map((u) => {
      const status = isTrialExpired(u) ? 'EXPIRED' : 'active';
      return `• ${u.phone} | key: ${u.betaKey} (${u.keyName}) | ${status} | msgs: ${u.messageCount} | services: ${u.services.join(',')}`;
    });
    await send(from, `*Users (${users.length})*\n${lines.join('\n')}`);
    return true;
  }

  // /revoke <phone>
  const revokeMatch = trimmed.match(/^\/revoke\s+(\d+)$/i);
  if (revokeMatch) {
    const ok = await deleteUser(revokeMatch[1]);
    await send(from, ok ? `Revoked access for ${revokeMatch[1]}.` : `No user found for ${revokeMatch[1]}.`);
    return true;
  }

  // /extend <phone> <hours>
  const extendMatch = trimmed.match(/^\/extend\s+(\d+)\s+(\d+)$/i);
  if (extendMatch) {
    const [ , phone, hours ] = extendMatch;
    const ok = await extendTrial(phone, parseInt(hours, 10));
    await send(from, ok ? `Extended ${phone} by ${hours}h.` : `No user found for ${phone}.`);
    return true;
  }

  return false;
}

async function sendMessage(to: string, text: string): Promise<void> {
  if (!sock) throw new Error('WhatsApp socket not initialised');
  const jid = `${to.replace('+', '')}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
}

async function connectToWhatsApp(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info({ version: version.join('.'), isLatest }, 'Baileys version');

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
  });

  // Register the send function with the router so it can reply to users.
  setSendFn(sendMessage);
  setReminderSendFn(sendMessage);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('QR Code received, please scan it:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      connectionStatus = 'disconnected';

      const shouldReconnect =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;

      logger.error({ shouldReconnect, error: lastDisconnect?.error }, 'Connection closed');

      if (shouldReconnect) {
        // Auto-reconnect on any disconnect except an explicit logout,
        // which would just loop forever since the session is invalid.
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      connectionStatus = 'connected';
      logger.info('WhatsApp connection established');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // 'notify' means a new message arrived; other types are history syncs etc.
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      // Skip WhatsApp status/story broadcasts — they have no useful payload and
      // can break the JID parsing below.
      if ((msg.key.remoteJidAlt ?? '').endsWith('@broadcast')) continue;

      const from = msg.key.remoteJidAlt?.split("@")[0]
      if (!from) {
        logger.warn({ remoteJidAlt: msg.key.remoteJidAlt }, 'Could not resolve sender number — skipping');
        continue;
      }

      const text =
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        msg.message.imageMessage?.caption ??
        '';

      if (!text) continue;

      logger.info({ from }, 'Routing inbound message');

      // Admin path — skip user checks, allow admin commands, full service access.
      if (from === adminNumber) {
        const handled = await handleAdminCommand(from, text);
        if (handled) continue;
        try {
          await routeMessage(from, text, msg.pushName ?? undefined, [], true);
        } catch (err) {
          logger.error({ err }, 'Unhandled error in routeMessage');
        }
        continue;
      }

      // Regular user path — validate access before routing.
      try {
        const user = await getUser(from);

        // Not registered. If the message is an unused beta key, activate them;
        // otherwise stay silent unless they're a known-but-unregistered contact
        // who clearly wants in (invite them). We only reply to beta keys here —
        // unknown strangers get dropped to avoid revealing the bot's existence.
        if (!user) {
          const keyRow = await isKeyValid(text);
          if (keyRow) {
            const userName = keyRow.name;
            await activateUser(from, text);
            logger.info({ from }, 'User activated via beta key');
            await sendMessage(from, `Welcome aboard! 🎉 Your trial is now active. Type /help to see what I can do.`);
            // Notify admin that a user has onboarded
            try {
              await sendMessage(adminNumber, `${userName}'s trial is now active (${from})`);
            } catch (err) {
              logger.error({ err }, 'Failed to notify admin of user activation');
            }
          }
          continue;
        }

        // Trial expired.
        if (isTrialExpired(user)) {
          await sendMessage(from, `Your trial has expired. Please contact admin to continue.`);
          continue;
        }

        // Rate limit.
        const rate = checkRateLimit(user);
        if (!rate.allowed) {
          await sendMessage(from, rate.reason ?? 'Slow down.');
          continue;
        }

        await recordMessage(user);

        try {
          await routeMessage(from, text, msg.pushName ?? undefined, user.services, false);
        } catch (err) {
          logger.error({ err }, 'Unhandled error in routeMessage');
        }
      } catch (err) {
        logger.error({ err, from }, 'Unhandled error in user validation');
        try {
          await sendMessage(from, 'Something went wrong. Please try again.');
        } catch (sendErr) {
          logger.error({ sendErr }, 'Failed to send error reply');
        }
      }
    }
  });
}

// Validate config at startup so a bad config.json fails before the server
// starts accepting traffic.
loadConfig();

const apiRouter = createRouter(() => connectionStatus, sendMessage);
app.use('/', apiRouter);

app.listen(parseInt(env.PORT, 10), () => {
  logger.info({ port: env.PORT }, 'Odyssey server started');
  connectToWhatsApp();
});
