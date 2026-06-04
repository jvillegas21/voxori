import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import type { Json } from '@voxori/database/types';

/**
 * integrations.credentials column (jsonb) stores either:
 *
 * 1. Encrypted blob (all new writes):
 *    { _encrypted: true, iv: base64, tag: base64, payload: base64 }
 *    Plaintext inside payload is JSON.stringify(Record<string, string>) — e.g.
 *    api_key, access_token, refresh_token, account_id, or { mode: 'platform' }.
 *
 * 2. Legacy plaintext (read-only backward compat via decryptCredentials):
 *    { api_key: "...", ... } without _encrypted — migrate by reconnecting integration.
 *
 * Key: SHA-256(CREDENTIALS_ENCRYPTION_KEY ?? INTERNAL_API_SECRET).
 * Algorithm: AES-256-GCM, 12-byte random IV per encrypt.
 */
const ALGORITHM = 'aes-256-gcm';

const FORBIDDEN_CONFIG_KEYS = new Set([
  'api_key',
  'apikey',
  'secret',
  'client_secret',
  'access_token',
  'refresh_token',
  'password',
  'token',
  'private_key',
]);

export class CredentialsEncryptionError extends Error {
  constructor(
    message = 'CREDENTIALS_ENCRYPTION_KEY or INTERNAL_API_SECRET must be set to store integration credentials securely'
  ) {
    super(message);
    this.name = 'CredentialsEncryptionError';
  }
}

function getEncryptionKey(): Buffer | null {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY ?? process.env.INTERNAL_API_SECRET;
  if (!secret) return null;
  return createHash('sha256').update(secret).digest();
}

export function isCredentialsEncryptionConfigured(): boolean {
  return getEncryptionKey() !== null;
}

export function assertCredentialsEncryptionConfigured(): void {
  if (!getEncryptionKey()) {
    throw new CredentialsEncryptionError();
  }
}

/** Reject secrets in integrations.config — metadata only (provider, market_id, etc.). */
export function assertIntegrationConfigHasNoSecrets(
  config: Record<string, unknown>
): void {
  for (const key of Object.keys(config)) {
    const normalized = key.toLowerCase().replace(/-/g, '_');
    if (FORBIDDEN_CONFIG_KEYS.has(normalized)) {
      throw new Error(
        `integrations.config must not contain "${key}"; store secrets in encrypted credentials only`
      );
    }
  }
}

export function encryptCredentials(data: Record<string, string>): Json {
  const key = getEncryptionKey();
  if (!key) {
    throw new CredentialsEncryptionError();
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    _encrypted: true,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    payload: encrypted.toString('base64'),
  } as unknown as Json;
}

export function decryptCredentials(credentials: Json | null): Record<string, string> {
  if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
    return {};
  }

  const record = credentials as Record<string, unknown>;
  if (!record._encrypted) {
    return Object.fromEntries(
      Object.entries(record).filter(([, v]) => typeof v === 'string')
    ) as Record<string, string>;
  }

  const key = getEncryptionKey();
  if (!key || typeof record.iv !== 'string' || typeof record.tag !== 'string' || typeof record.payload !== 'string') {
    return {};
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(record.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.payload, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8')) as Record<string, string>;
}

export function isEncryptedCredentialsBlob(credentials: Json | null): boolean {
  if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
    return false;
  }
  return (credentials as Record<string, unknown>)._encrypted === true;
}
