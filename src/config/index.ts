import { env } from './env';
import { OdysseyConfigSchema, OdysseyConfig } from '../types/config';

// Config is built from env vars + literal app metadata. Secrets and per-env URLs
// stay in env; descriptions and command routes live here as source.
const rawConfig: OdysseyConfig = {
  apps: {
    liaw: {
      webhook_url: env.LIAW_WEBHOOK_URL,
      description: 'Personal task manager and weekly planner',
      webhook_secret: env.LIAW_WEBHOOK_SECRET,
    },
    keep: {
      webhook_url: env.NOTES_WEBHOOK_URL,
      description: 'Save notes, links, bookmarks and random texts',
      webhook_secret: env.NOTES_WEBHOOK_SECRET,
    },
  },
  explicit_commands: {
    '/task': 'liaw',
    '/today': 'liaw',
    '/week': 'liaw',
    '/done': 'liaw',
    '/otp': 'liaw',
    '/keep': 'keep',
    '/list': 'keep',
  },
  // Commands handled entirely in-process — never forwarded to a webhook.
  local_commands: ['/remind', '/help'],
};

// Validate once at startup so a typo here surfaces immediately, not on first message.
const parsed = OdysseyConfigSchema.safeParse(rawConfig);
if (!parsed.success) {
  throw new Error(`Invalid Odyssey config:\n${parsed.error.message}`);
}

const cachedConfig = parsed.data;

export function loadConfig(): OdysseyConfig {
  return cachedConfig;
}
