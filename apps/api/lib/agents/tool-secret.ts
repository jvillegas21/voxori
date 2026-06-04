import { randomBytes } from 'node:crypto';

export function generateToolSecret(): string {
  return randomBytes(32).toString('hex');
}

export function ensureToolSecret(config: Record<string, unknown>): string {
  const existing = config.tool_secret;
  if (typeof existing === 'string' && existing.trim().length >= 16) {
    return existing.trim();
  }
  return generateToolSecret();
}
