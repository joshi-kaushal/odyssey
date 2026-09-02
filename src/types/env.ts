import { z } from 'zod';

export const EnvSchema = z.object({
  PORT: z.string().default('3000'),
  GATEWAY_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  // Comma-separated admin numbers, no + prefix (e.g. "919876543210").
  // These are the only numbers that bypass user checks and can run admin commands.
  ALLOWED_NUMBERS: z.string().min(1),

  // Comma-separated invite codes. Each code grants access to all services.
  BETA_KEYS: z.string().default(''),
  // How long a trial lasts after activation, in hours.
  TRIAL_DURATION_HOURS: z.string().default('24'),
  // Connection string for Railway PostgreSQL addon.
  DATABASE_URL: z.string().min(1),

  SESSION_TTL_MINUTES: z.string().default('5'),
  WEBHOOK_TIMEOUT_MS: z.string().default('10000'),
  AI_CONFIDENCE_THRESHOLD: z.string().default('0.6'),

  // Downstream app: Live in a Week
  LIAW_WEBHOOK_URL: z.string().url(),
  LIAW_WEBHOOK_SECRET: z.string().min(1),

  // Downstream app: keep (notes/links/voice)
  NOTES_WEBHOOK_URL: z.string().url(),
  NOTES_WEBHOOK_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof EnvSchema>;
