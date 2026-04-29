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
    logger.info({ app: payload.app, intent: payload.intent }, 'Forwarded to downstream app');
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

export async function routeMessage(from: string, text: string): Promise<void> {
  const config = loadConfig();
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const timestamp = new Date().toISOString();
  
  // --- Tier 1: Explicit command (fast path) ---
  // Commands are deterministic — bypassing the AI keeps latency under 200ms.
  for (const [command, appKey] of Object.entries(config.explicit_commands)) {
    if (lower.startsWith(command.toLowerCase())) {
      const app = config.apps[appKey];
      if (!app) {
        logger.warn({ command, appKey }, 'Explicit command maps to unknown app in config');
        return;
      }

      const payload: WebhookPayload = {
        from,
        raw_text: trimmed,
        intent: command.toLowerCase(),
        app: appKey,
        entities: {},
        timestamp,
      };

      setSession(from, appKey);
      await forwardToApp(app.webhook_url, payload, app.webhook_secret);
      return;
    }
  }

  // --- Tier 2: Active session (continuation fast path) ---
  // If the user was recently talking to an app, continue routing there
  // to maintain conversational continuity without paying the AI latency cost.
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
      };

      setSession(from, session.lastApp);
      await forwardToApp(app.webhook_url, payload, app.webhook_secret);
      return;
    }
  }

  // --- Tier 3: AI classification (fallback) ---
  try {
    const result = await classifyMessage(trimmed, config);
    logger.info({ intent: result.intent, app: result.app, confidence: result.confidence }, 'AI classified');

    if (result.confidence >= CONFIDENCE_THRESHOLD) {
      const app = config.apps[result.app];
      if (!app) {
        logger.warn({ app: result.app }, 'AI resolved to unknown app key');
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
      };

      // Update session so follow-up messages skip AI classification.
      setSession(from, result.app);
      await forwardToApp(app.webhook_url, payload, app.webhook_secret);
    } else {
      // Confidence too low to route — try answering directly before giving up.
      const directAnswer = await answerDirectly(trimmed);
      if (directAnswer) {
        await reply(from, directAnswer);
      } else {
        await reply(from, "I didn't quite understand that. Try a command like `/task` or `/link`.");
      }
    }
  } catch (err) {
    logger.error({ err }, 'Routing error');
    await reply(from, 'Something went wrong. Please try again.');
  }
}
