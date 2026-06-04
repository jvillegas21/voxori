import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertCredentialsEncryptionConfigured,
  assertIntegrationConfigHasNoSecrets,
  CredentialsEncryptionError,
  decryptCredentials,
  encryptCredentials,
  isEncryptedCredentialsBlob,
} from '../credentials';

const TEST_KEY = 'test-credentials-encryption-secret';

describe('credentials encryption', () => {
  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    delete process.env.INTERNAL_API_SECRET;
  });

  it('roundtrips api_key through encrypt and decrypt', () => {
    const encrypted = encryptCredentials({ api_key: 'idx-secret-key-12345' });
    expect(isEncryptedCredentialsBlob(encrypted)).toBe(true);

    const decrypted = decryptCredentials(encrypted);
    expect(decrypted.api_key).toBe('idx-secret-key-12345');
  });

  it('roundtrips OAuth tokens', () => {
    const encrypted = encryptCredentials({
      access_token: 'at-123',
      refresh_token: 'rt-456',
      expires_at: new Date().toISOString(),
    });
    const decrypted = decryptCredentials(encrypted);
    expect(decrypted.access_token).toBe('at-123');
    expect(decrypted.refresh_token).toBe('rt-456');
  });

  it('throws when encryption key is not configured', () => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    delete process.env.INTERNAL_API_SECRET;
    expect(() => encryptCredentials({ api_key: 'x' })).toThrow(CredentialsEncryptionError);
    expect(() => assertCredentialsEncryptionConfigured()).toThrow(CredentialsEncryptionError);
  });

  it('reads legacy plaintext credentials for migration', () => {
    const legacy = { api_key: 'legacy-plain' } as ReturnType<typeof encryptCredentials>;
    expect(decryptCredentials(legacy)).toEqual({ api_key: 'legacy-plain' });
  });

  it('rejects api_key in integration config metadata', () => {
    expect(() => assertIntegrationConfigHasNoSecrets({ api_key: 'leak' })).toThrow(/credentials/);
    expect(() => assertIntegrationConfigHasNoSecrets({ provider: 'idx_broker' })).not.toThrow();
  });
});
