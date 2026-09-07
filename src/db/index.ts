import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool, PoolConfig } from 'pg';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import { env } from '../config/env';
import * as schema from './schema';

const logger = pino({ level: 'info' });

function getPoolConfig(): PoolConfig {
  const url = env.DATABASE_URL;
  const isInternal =
    url.includes('.railway.internal') ||
    url.includes('localhost') ||
    url.includes('127.0.0.1');

  const isExplicitSsl =
    process.env.DATABASE_SSL === 'true' ||
    url.includes('sslmode=require') ||
    url.includes('ssl=true');

  const isExplicitNoSsl =
    process.env.DATABASE_SSL === 'false' ||
    url.includes('sslmode=disable');

  const needsSsl = !isExplicitNoSsl && (isExplicitSsl || (!isInternal && url.includes('rlwy.net')));

  return {
    connectionString: url,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export const pool = new Pool(getPoolConfig());

export const db = drizzle(pool, { schema });

export { schema };

export async function runMigrations(retries = 5, delayMs = 3000): Promise<void> {
  let migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  if (!fs.existsSync(path.join(migrationsFolder, 'meta', '_journal.json'))) {
    migrationsFolder = path.resolve(__dirname, '../../drizzle');
  }

  logger.info({ migrationsFolder }, 'Applying database migrations...');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await migrate(db, { migrationsFolder });
      logger.info('Database migrations applied successfully');
      return;
    } catch (err: any) {
      if (attempt < retries) {
        logger.warn(
          { attempt, retries, err: err?.message ?? err },
          `Database migration failed, retrying in ${delayMs / 1000}s...`
        );
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        logger.error({ err }, 'Database migration failed after all retries');
        throw err;
      }
    }
  }
}

