import { z } from 'zod';

export const ClassificationResultSchema = z.object({
  intent: z.string(),
  app: z.string(),
  confidence: z.number().min(0).max(1),
  raw_text: z.string(),
  entities: z.record(z.string(), z.string()),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;
