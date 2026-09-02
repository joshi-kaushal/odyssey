import axios from 'axios';
import pino from 'pino';
import { loadConfig } from '../config';
import { env } from '../config/env';
import { getSession, setSession } from '../session';
import { classifyMessage, answerDirectly } from '../ai';
import { WebhookPayload } from '../types/payload';
import { parseDurationToMinutes, parseDateShortcut } from '../reminders/duration';
import { addReminder } from '../reminders';
import crypto from 'crypto';

const logger = pino({ level: 'info' });

const CONFIDENCE_THRESHOLD = parseFloat(env.AI_CONFIDENCE_THRESHOLD);
const WEBHOOK_TIMEOUT_MS = parseInt(env.WEBHOOK_TIMEOUT_MS, 10);

// Injected from index.ts once Baileys connects. Using a setter avoids a circular
// import between the router and the Baileys socket initialisation.
let sendWhatsAppMessage: ((to: string, text: string) => Promise<void>) | null = null;

export function setSendFn(fn: (to: string, text: string) => Promise<void>): void {
  sendWhatsAppMessage = fn;
}

type LocalCommand = {
  pattern: RegExp | string;
  handler: (from: string, text: string, pushName?: string) => Promise<void>;
};

const localCommands: LocalCommand[] = [
  {
    pattern: /^\/remind\s/i,
    handler: async (from, text) => {
      const send = sendWhatsAppMessage;
      if (!send) return;

      // Syntax: /remind <date-or-duration> <text...>
      // Date shortcuts: tomorrow, tmrw, nextweek, nextmonth, 7d, 29days
      // Duration: 30 min, 2h, 1 day 3h
      // Date + time: tomorrow 5pm, nextweek 10am
      const match = text.match(/^\/remind\s+(\S+)\s+(.+)/i);
      if (!match) {
        const usage = `*Usage:* /remind <date-or-duration> <text>
• /remind tomorrow 5pm team standup
• /remind 30 min buy milk
• /remind nextweek review doc`;
        await send(from, usage);
        return;
      }

      const [, datetimePart, reminderText] = match;

      // Try date shortcut first (e.g. "tomorrow 5pm", "nextweek", "7d")
      const dateResult = parseDateShortcut(datetimePart);
      if (dateResult !== null) {
        const jobId = crypto.randomUUID();
        addReminder(jobId, { at: dateResult.getTime(), text: reminderText.trim(), to: from });
        await send(from, `Reminder set for ${reminderText.trim()}.`);
        return;
      }

      // Fall back to duration (e.g. "30 min", "2h", "1 day")
      const minutes = parseDurationToMinutes(datetimePart);
      if (minutes === null) {
        await send(from, 'Could not parse that date or duration. Try "tomorrow 5pm", "30 min", or "7d".');
        return;
      }

      const jobId = crypto.randomUUID();
      const at = Date.now() + minutes * 60_000;
      addReminder(jobId, { at, text: reminderText.trim(), to: from });
      await send(from, `Reminder set for ${reminderText.trim()}.`);
    },
  },
  {
    // Matches both `/help` and `/help <service>` (captures the optional service name).
    pattern: /^\/help(?:\s+(\S+))?$/i,
    handler: async (from, text, pushName) => {
      const send = sendWhatsAppMessage;
      if (!send) return;

      const serviceMatch = text.match(/^\/help\s+(\S+)/i);
      const config = loadConfig();

      // /help <service> — forward to that service's webhook.
      if (serviceMatch) {
        const requested = serviceMatch[1].toLowerCase();
        const app = config.apps[requested];
        if (app) {
          const payload: WebhookPayload = {
            from,
            raw_text: '/help',
            intent: '/help',
            app: requested,
            entities: {},
            timestamp: new Date().toISOString(),
            push_name: pushName,
          };
          await forwardToApp(app.webhook_url, payload, app.webhook_secret);
          return;
        } else {
          const available = Object.keys(config.apps).join(', ');
          await send(from, `Unknown service "${requested}". Available: ${available}`);
          return;
        }
      }

      // /help — show Odyssey commands + onboarded services.
      const services = Object.entries(config.apps)
        .map(([key, app]) => `• \`/help ${key}\` — ${app.description}`)
        .join('\n');

      const helpText = `*Odyssey Bot* 🗺️

Available commands:
•	\`/remind <date-or-duration> <text>\` — set a one-off reminder
• \`/help\` — show this message

Services:
${services}`.trim();
      await send(from, helpText);
    },
  },
];

async function forwardToApp(webhookUrl: string, payload: WebhookPayload, webhookSecret?: string): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (webhookSecret) {
      // Each downstream app can verify this header to authenticate the call is from Odyssey.
      headers['x-gateway-secret'] = webhookSecret;
    }
    logger.info("Forwarding to downstream app: ", { webhookUrl, payload, headers })
    await axios.post(webhookUrl, payload, { timeout: WEBHOOK_TIMEOUT_MS, headers });
  } catch (err) {
    // A downstream app failing should never bring down the gateway.
    logger.error({ err, url: webhookUrl }, 'Failed to forward to downstream app');
  }
}

async function reply(to: string, text: string): Promise<void> {
  if (!sendWhatsAppMessage) {
    logger.warn('Cannot reply — WhatsApp send function not yet registered');
    return;
  }
  try {
    await sendWhatsAppMessage(to, text);
  } catch (err) {
    logger.error({ err }, 'Failed to send WhatsApp reply');
  }
}

export async function routeMessage(from: string, text: string, pushName?: string): Promise<void> {
  const config = loadConfig();
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const timestamp = new Date().toISOString();


  // #region Tier 0: Local commands (in-process — not forwarded to a webhook)
  for (const cmd of localCommands) {
    if (
      (cmd.pattern instanceof RegExp && cmd.pattern.test(trimmed)) ||
      (typeof cmd.pattern === 'string' && lower.startsWith(cmd.pattern.toLowerCase()))
    ) {
      await cmd.handler(from, trimmed, pushName);
      return;
    }
  }

  // #region Tier 1: Explicit command (fast path)
  for (const [command, appKey] of Object.entries(config.explicit_commands)) {
    if (lower.startsWith(command.toLowerCase())) {
      const app = config.apps[appKey];
      if (!app) {
        logger.warn({ command, appKey }, 'routeMessage: tier1 command maps to unknown app');
        return;
      }

      const payload: WebhookPayload = {
        from,
        raw_text: trimmed,
        intent: command.toLowerCase(),
        app: appKey,
        entities: {},
        timestamp,
        push_name: pushName,
      };
      setSession(from, appKey);
      await forwardToApp(app.webhook_url, payload, app.webhook_secret);
      return;
    }
  }


  // #region Tier 2: Active session (continuation fast path)
  const session = getSession(from);
  if (session) {
    const app = config.apps[session.lastApp];
    if (app) {
      const payload: WebhookPayload = {
        from,
        raw_text: trimmed,
        intent: 'continuation',
        app: session.lastApp,
        entities: {},
        timestamp,
        push_name: pushName,
      };

      setSession(from, session.lastApp);
      await forwardToApp(app.webhook_url, payload, app.webhook_secret);
      return;
    }
  }

  // #region AI classification (fallback)
  try {
    const result = await classifyMessage(trimmed, config);

    if (result.confidence >= CONFIDENCE_THRESHOLD) {
      const app = config.apps[result.app];
      if (!app) {
        logger.warn({ app: result.app }, 'routeMessage: tier3 AI resolved unknown app key');
        await reply(from, "I'm not sure where to send that. Try a command like `/task` or `/link`.");
        return;
      }

      const payload: WebhookPayload = {
        from,
        raw_text: result.raw_text,
        intent: result.intent,
        app: result.app,
        entities: result.entities,
        timestamp,
        push_name: pushName,
      };

      setSession(from, result.app);
      await forwardToApp(app.webhook_url, payload, app.webhook_secret);
    } else {
      const directAnswer = await answerDirectly(trimmed);
      if (directAnswer) {
        await reply(from, directAnswer);
      } else {
        await reply(from, "I didn't quite understand that. Try a command like `/task` or `/link`.");
      }
    }
  } catch (err) {
    logger.error({ err }, 'routeMessage: tier3 error');
    await reply(from, 'Something went wrong. Please try again.');
  }
}
