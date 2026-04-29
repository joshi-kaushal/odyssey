import { UserSession } from '../types/session';
import { env } from '../config/env';

const sessions = new Map<string, UserSession>();

// Parsed once to avoid repeated string-to-number conversion in the hot path.
const TTL_MS = parseInt(env.SESSION_TTL_MINUTES, 10) * 60 * 1000;

export function getSession(phoneNumber: string): UserSession | null {
  const session = sessions.get(phoneNumber);
  if (!session) return null;

  if (Date.now() - session.lastMessageAt > TTL_MS) {
    sessions.delete(phoneNumber);
    return null;
  }

  return session;
}

export function setSession(phoneNumber: string, app: string): void {
  sessions.set(phoneNumber, {
    lastApp: app,
    lastMessageAt: Date.now(),
  });
}
