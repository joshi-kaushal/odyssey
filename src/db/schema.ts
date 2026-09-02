import { pgTable, text, integer, bigint, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  phone: text('phone').primaryKey(),
  betaKey: text('beta_key').notNull(),
  activatedAt: timestamp('activated_at').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  services: text('services').array().notNull().default([]),
  messageCount: integer('message_count').notNull().default(0),
});

export const betaKeys = pgTable('beta_keys', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  used: boolean('used').notNull().default(false),
  usedBy: text('used_by'),
  usedAt: timestamp('used_at'),
});

export type UserRow = typeof users.$inferSelect;
export type BetaKeyRow = typeof betaKeys.$inferSelect;
