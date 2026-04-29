import { z } from 'zod';

export const UserSessionSchema = z.object({
  lastApp: z.string(),
  lastMessageAt: z.number(), // Unix ms
});

export type UserSession = z.infer<typeof UserSessionSchema>;
