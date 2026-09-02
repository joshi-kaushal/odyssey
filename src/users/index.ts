import crypto from 'crypto';
import { and, eq, lt } from 'drizzle-orm';
import { db, schema } from '../db';
import { env } from '../config/env';
import { loadConfig } from '../config';
import pino from 'pino';

const logger = pino({ level: 'info' });

// Hardcoded rate limit — one window, N messages per hour.
const RATE_LIMIT_PER_HOUR = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export const TRIAL_DURATION_MS = parseInt(env.TRIAL_DURATION_HOURS, 10) * 60 * 60 * 1000;

// Unambiguous charset for readable keys (no 0/O/1/I/L).
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSegment(len: number): string {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += CHARS[bytes[i] % CHARS.length];
  return out;
}

function generateKeyCode(): string {
  return `sk_${randomSegment(8)}`;
}

// Name must be a single word: letters, numbers, - or _ only (no spaces).
const NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export function validateName(name: string): boolean {
  return NAME_PATTERN.test(name);
}

// Wrap DB operations to prevent raw errors from leaking to users.
async function dbOp<T>(op: () => Promise<T>, context: string): Promise<T> {
  try {
    return await op();
  } catch (err: any) {
    logger.error({ err, context }, 'Database operation failed');
    throw new Error('Service temporarily unavailable');
  }
}

// ---- Beta key operations ----

export async function createKey(name: string): Promise<{ code: string }> {
  if (!validateName(name)) {
    throw new Error('Usage: /generate-key <name>');
  }

  return dbOp(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateKeyCode();
      try {
        await db.insert(schema.betaKeys).values({ code, name }).returning();
        return { code };
      } catch (e: any) {
        if (e.code !== '23505') throw e; // unique_violation only
      }
    }
    throw new Error('Failed to generate unique key — try again');
  }, 'createKey');
}

export async function listKeys(): Promise<schema.BetaKeyRow[]> {
  return dbOp(() => db.select().from(schema.betaKeys).orderBy(schema.betaKeys.createdAt), 'listKeys');
}

export async function isKeyValid(code: string): Promise<schema.BetaKeyRow | null> {
  return dbOp(() => db
    .select()
    .from(schema.betaKeys)
    .where(and(eq(schema.betaKeys.code, code.trim()), eq(schema.betaKeys.used, false)))
    .limit(1)
    .then(rows => rows[0] ?? null), 'isKeyValid');
}

// ---- User operations ----

export async function getUser(phone: string): Promise<schema.UserRow | null> {
  return dbOp(() => db
    .select()
    .from(schema.users)
    .where(eq(schema.users.phone, phone))
    .limit(1)
    .then(rows => rows[0] ?? null), 'getUser');
}

export async function activateUser(phone: string, key: string): Promise<schema.UserRow> {
  const now = Date.now();
  const services = Object.keys(loadConfig().apps);

  return dbOp(async () => {
    // Transaction: create user + mark key used atomically.
    return await db.transaction(async (tx) => {
      // Lock the key row for update to prevent race conditions.
      const keyRows = await tx
        .select()
        .from(schema.betaKeys)
        .where(and(eq(schema.betaKeys.code, key.trim()), eq(schema.betaKeys.used, false)))
        .for('update')
        .limit(1);

      const keyRow = keyRows[0];
      if (!keyRow) {
        throw new Error('Invalid or already used invite code');
      }

      // Insert user.
      const userRows = await tx
        .insert(schema.users)
        .values({
          phone,
          betaKey: key.trim(),
          activatedAt: new Date(now),
          expiresAt: new Date(now + TRIAL_DURATION_MS),
          services,
          messageCount: 0,
        })
        .onConflictDoNothing()
        .returning();

      // Mark key as used.
      await tx
        .update(schema.betaKeys)
        .set({ used: true, usedBy: phone, usedAt: new Date(now) })
        .where(eq(schema.betaKeys.code, key.trim()));

      if (!userRows[0]) {
        const existing = await getUser(phone);
        if (existing) return existing;
        throw new Error(`Could not activate user ${phone}`);
      }

      return userRows[0];
    });
  }, 'activateUser');
}

export function isTrialExpired(user: schema.UserRow): boolean {
  return user.expiresAt.getTime() <= Date.now();
}

export async function recordMessage(user: schema.UserRow): Promise<void> {
  await dbOp(() => db
    .update(schema.users)
    .set({ messageCount: user.messageCount + 1 })
    .where(eq(schema.users.phone, user.phone)), 'recordMessage');
}

export interface RateCheck {
  allowed: boolean;
  reason?: string;
}

export function checkRateLimit(user: schema.UserRow): RateCheck {
  if (user.messageCount >= RATE_LIMIT_PER_HOUR) {
    return { allowed: false, reason: `You've sent ${user.messageCount} messages this hour. Slow down.` };
  }
  return { allowed: true };
}

// ---- Admin helpers ----

export async function listAllUsers(): Promise<schema.UserRow[]> {
  return dbOp(() => db.select().from(schema.users), 'listAllUsers');
}

export async function listUsersWithKeys(): Promise<(schema.UserRow & { keyName: string })[]> {
  return dbOp(async () => {
    const users = await db.select().from(schema.users);
    const keys = await db.select().from(schema.betaKeys);
    const keyMap = new Map(keys.map((k) => [k.code, k.name]));
    return users.map((u) => ({ ...u, keyName: keyMap.get(u.betaKey) ?? 'unknown' }));
  }, 'listUsersWithKeys');
}

export async function deleteUser(phone: string): Promise<boolean> {
  return dbOp(async () => {
    const res = await db.delete(schema.users).where(eq(schema.users.phone, phone));
    return !!res.rowCount;
  }, 'deleteUser');
}

export async function extendTrial(phone: string, hours: number): Promise<boolean> {
  return dbOp(async () => {
    const user = await getUser(phone);
    if (!user) return false;
    const newExpiry = Math.max(user.expiresAt.getTime(), Date.now()) + hours * 60 * 60 * 1000;
    await db
      .update(schema.users)
      .set({ expiresAt: new Date(newExpiry) })
      .where(eq(schema.users.phone, phone));
    return true;
  }, 'extendTrial');
}

export async function countExpiredUsers(): Promise<number> {
  return dbOp(() => db
    .select({ id: schema.users.phone })
    .from(schema.users)
    .where(lt(schema.users.expiresAt, new Date(Date.now())))
    .then(rows => rows.length), 'countExpiredUsers');
}