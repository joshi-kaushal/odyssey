import { z } from 'zod';

export const AppConfigSchema = z.object({
  webhook_url: z.string().url(),
  description: z.string().min(1),
  // Optional shared secret sent as x-gateway-secret header on every inbound webhook call.
  // Store the actual value in an env var and reference it here — never hardcode secrets.
  webhook_secret: z.string().optional(),
});

export const OdysseyConfigSchema = z.object({
  apps: z.record(z.string(), AppConfigSchema),
  explicit_commands: z.record(z.string(), z.string()),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type OdysseyConfig = z.infer<typeof OdysseyConfigSchema>;
