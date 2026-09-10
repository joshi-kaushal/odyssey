import axios from 'axios';
import pino from 'pino';
import { loadConfig } from '../config';
import { env } from '../config/env';
import { getSession, setSession } from '../session';
import { classifyMessage, answerDirectly } from '../ai';
import { WebhookPayload } from '../types/payload';
import { parseWhen, remindRegex, REMINDER_TIMEZONE } from '../reminders/when';
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
  handler: (from: string, text: string, pushName: string | undefined, allowedServices: string[], isAdmin: boolean) => Promise<void>;
};

const localCommands: LocalCommand[] = [
  {
    pattern: /^\/remind\s/i,
    handler: async (from, text) => {
      const send = sendWhatsAppMessage;
      if (!send) return;

      // Syntax: /remind <when> <text...>
      const match = text.match(remindRegex);
      if (!match) {
        const usage = `*Usage:* /remind <when> <text>
• /remind tomorrow 5pm team standup
• /remind next monday gym
• /remind 25 sep at 14:30 birthday
• /remind in 2 hours check server
• /remind 10pm call mom
• /remind 25/09/2026 submit report`;
        await send(from, usage);
        return;
      }

      const [, whenStr, reminderText] = match;
      const date = parseWhen(whenStr);
      if (!date) {
        await send(from, 'Could not parse that date or time. Try "tomorrow 5pm", "next monday", or "in 2 hours".');
        return;
      }

      const jobId = crypto.randomUUID();
      addReminder(jobId, { at: date.getTime(), text: reminderText.trim(), to: from });

      const formatted = date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: REMINDER_TIMEZONE,
      });
      await send(from, `Reminder set for ${reminderText.trim()} on ${formatted}.`);
    },
  },
  {
    // Matches both `/help` and `/help <service>` (captures the optional service name).
    pattern: /^\/help(?:\s+(\S+))?$/i,
    handler: async (from, text, pushName, allowedServices, isAdmin) => {
      const send = sendWhatsAppMessage;
      if (!send) return;

      const serviceMatch = text.match(/^\/help\s+(\S+)/i);
      const config = loadConfig();

      // /help <service> — forward to that service's webhook.
      if (serviceMatch) {
        const requested = serviceMatch[1].toLowerCase();
        const app = config.apps[requested];
        if (app) {
          if (allowedServices.length > 0 && !allowedServices.includes(requested)) {
            await send(from, `You don't have access to the \`${requested}\` service.`);
            return;
          }
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

      // /help — show Odyssey commands + onboarded services the user can access.
      const services = Object.entries(config.apps)
        .filter(([key]) => allowedServices.length === 0 || allowedServices.includes(key))
        .map(([key, app]) => `• \`/help ${key}\` — ${app.description}`)
        .join('\n');

      let helpText = `*Odyssey Bot* 🗺️

Available commands:
•	\`/remind <date-or-duration> <text>\` — set a one-off reminder
• \`/help\` — show this message

Services:
${services}`;

      if (isAdmin) {
        helpText += `

Admin commands:
• \`/generate-key <name>\` — create an invite key
• \`/keys\` — list all keys and their status
• \`/users\` — list all users with key names
• \`/revoke <phone>\` — revoke a user's access
• \`/extend <phone> <hours>\` — extend a user's trial`;
      }

      await send(from, helpText.trim());
    },
  },
];

async function forwardToApp(webhookUrl: string, payload: WebhookPayload, webhookSecret?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (webhookSecret) {
      headers['x-gateway-secret'] = webhookSecret;
    }
    await axios.post(webhookUrl, payload, { timeout: WEBHOOK_TIMEOUT_MS, headers });
    return { ok: true };
  } catch (err: any) {
    logger.error({ err, url: webhookUrl }, 'Failed to forward to downstream app');
    const errorMsg = err.code === 'ECONNREFUSED'
      ? 'Service is unreachable'
      : err.code === 'ETIMEDOUT' || err.message?.includes('timeout')
        ? 'Service timed out'
        : 'Service error';
    return { ok: false, error: errorMsg };
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

export async function routeMessage(from: string, text: string, pushName?: string, allowedServices: string[] = [], isAdmin = false): Promise<void> {
  const config = loadConfig();
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const timestamp = new Date().toISOString();

  const canUse = (appKey: string): boolean => {
    // Empty allowedServices means full access (admin / unrestricted).
    return allowedServices.length === 0 || allowedServices.includes(appKey);
  };


  // #region Tier 0: Local commands (in-process — not forwarded to a webhook)
  for (const cmd of localCommands) {
    if (
      (cmd.pattern instanceof RegExp && cmd.pattern.test(trimmed)) ||
      (typeof cmd.pattern === 'string' && lower.startsWith(cmd.pattern.toLowerCase()))
    ) {
      await cmd.handler(from, trimmed, pushName, allowedServices, isAdmin);
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

      if (!canUse(appKey)) {
        await reply(from, `You don't have access to the \`${appKey}\` service.`);
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
      const result = await forwardToApp(app.webhook_url, payload, app.webhook_secret);
      if (!result.ok) {
        await reply(from, `⚠️ ${result.error}. Your message was not delivered. Try again later.`);
      }
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
      const result = await forwardToApp(app.webhook_url, payload, app.webhook_secret);
      if (!result.ok) {
        await reply(from, `⚠️ ${result.error}. Your message was not delivered. Try again later.`);
      }
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

      if (!canUse(result.app)) {
        await reply(from, `You don't have access to the \`${result.app}\` service.`);
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
      const result2 = await forwardToApp(app.webhook_url, payload, app.webhook_secret);
      if (!result2.ok) {
        await reply(from, `⚠️ ${result2.error}. Your message was not delivered. Try again later.`);
      }
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
