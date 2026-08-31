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

const logger = pino({ level: 'info' });

const app = express();
app.use(express.json());

// AUTH_DIR can be overridden so the Railway Volume mount path can differ from local dev.
const AUTH_DIR = process.env.AUTH_DIR ?? 'auth_info_baileys';

let sock: WASocket | null = null;
let connectionStatus: 'connected' | 'disconnected' = 'disconnected';

// Parsed once — used in the hot path for every inbound message.
const allowedNumbers = new Set(
  env.ALLOWED_NUMBERS.split(',').map((n) => n.trim())
);
// First whitelisted number is treated as the admin — receives alerts about
// unauthorized senders so the gateway's existence stays hidden from them.
const adminNumber = env.ALLOWED_NUMBERS.split(',').map((n) => n.trim())[0];

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

      // Silently drop non-whitelisted senders — no response avoids revealing
      // that this gateway exists to unknown callers. Notify admin instead.
      if (!allowedNumbers.has(from)) {
        logger.warn({ from }, 'Message from non-whitelisted number — dropped');
        if (adminNumber && adminNumber !== from) {
          try {
            await sendMessage(adminNumber, `Unauthorized number ${from} attempted to message the bot.`);
          } catch (err) {
            logger.error({ err, from }, 'Failed to send admin alert for unauthorized sender');
          }
        }
        continue;
      }

      logger.info({ from }, 'Routing inbound message');

      try {
        await routeMessage(from, text, msg.pushName ?? undefined);
      } catch (err) {
        logger.error({ err }, 'Unhandled error in routeMessage');
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
