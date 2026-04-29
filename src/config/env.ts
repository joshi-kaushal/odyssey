import 'dotenv/config';
import { EnvSchema } from '../types/env';

// Fail at startup if env is misconfigured — better than a cryptic runtime error mid-request.
const result = EnvSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(`Missing or invalid environment variables:\n${result.error.message}`);
}

export const env = result.data;
