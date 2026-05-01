import axios from 'axios';
import pino from 'pino';
import { loadConfig } from '../config';
import { env } from '../config/env';
import { getSession, setSession } from '../session';
import { classifyMessage, answerDirectly } from '../ai';
import { WebhookPayload } from '../types/payload';

const logger = pino({ level: 'info' });

const CONFIDENCE_THRESHOLD = parseFloat(env.AI_CONFIDENCE_THRESHOLD);
const WEBHOOK_TIMEOUT_MS = parseInt(env.WEBHOOK_TIMEOUT_MS, 10);

// Injected from index.ts once Baileys connects. Using a setter avoids a circular
// import between the router and the Baileys socket initialisation.
let sendWhatsAppMessage: ((to: string, text: string) => Promise<void>) | null = null;

export function setSendFn(fn: (to: string, text: string) => Promise<void>): void {
  sendWhatsAppMessage = fn;
}

async function forwardToApp(webhookUrl: string, payload: WebhookPayload, webhookSecret?: string): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (webhookSecret) {
      // Each downstream app can verify this header to authenticate the call is from Odyssey.
      headers['x-gateway-secret'] = webhookSecret;
    }
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
