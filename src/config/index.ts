import { env } from './env';
import { OdysseyConfigSchema, OdysseyConfig } from '../types/config';

// Config is built from env vars + literal app metadata. Secrets and per-env URLs
// stay in env; descriptions and command routes live here as source.
const rawConfig: OdysseyConfig = {
  apps: {
    live_in_a_week: {
      webhook_url: env.LIAW_WEBHOOK_URL,
      description: 'Personal task manager and weekly planner',
      webhook_secret: env.LIAW_WEBHOOK_SECRET,
    },
  },
  explicit_commands: {
    '/task': 'live_in_a_week',
    '/today': 'live_in_a_week',
    '/week': 'live_in_a_week',
    '/done': 'live_in_a_week',
    '/otp': 'live_in_a_week',
  },
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
