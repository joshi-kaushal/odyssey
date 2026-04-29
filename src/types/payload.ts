import { z } from 'zod';

export const WebhookPayloadSchema = z.object({
  from: z.string(),
  raw_text: z.string(),
  intent: z.string(),
  app: z.string(),
  entities: z.record(z.string(), z.string()),
  timestamp: z.string(), // ISO 8601
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
