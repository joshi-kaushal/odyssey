import { z } from 'zod';

export const ReminderSchema = z.object({
  at: z.number(), // Unix ms timestamp
  text: z.string(),
  to: z.string(), // phone number without +
});

export type Reminder = z.infer<typeof ReminderSchema>;
