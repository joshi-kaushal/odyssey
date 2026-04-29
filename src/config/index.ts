import fs from 'fs';
import path from 'path';
import { OdysseyConfigSchema, OdysseyConfig } from '../types/config';

// Config is loaded once at startup and cached. Hot-reloading is intentionally
// avoided — dynamic routing changes mid-run would be unpredictable.
let cachedConfig: OdysseyConfig | null = null;

export function loadConfig(): OdysseyConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = path.resolve(process.cwd(), 'config.json');
  const raw: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const result = OdysseyConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid config.json:\n${result.error.message}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}
