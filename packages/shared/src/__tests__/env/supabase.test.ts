import { afterEach, describe, expect, it } from 'vitest';
import {
  getSupabaseAnonKey,
  getSupabasePublicUrl,
  getSupabaseServiceRoleKey,
  isLocalSupabaseUrl,
} from '../../env/supabase';

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('getSupabasePublicUrl', () => {
  it('returns trimmed NEXT_PUBLIC_SUPABASE_URL', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '  http://127.0.0.1:54321  ';
    expect(getSupabasePublicUrl()).toBe('http://127.0.0.1:54321');
  });

  it('throws a helpful error when unset', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getSupabasePublicUrl()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => getSupabasePublicUrl()).toThrow(/db:sync-env/);
  });
});

describe('getSupabaseAnonKey', () => {
  it('returns anon key when set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    expect(getSupabaseAnonKey()).toBe('anon-key');
  });
});

describe('getSupabaseServiceRoleKey', () => {
  it('returns service role key when set', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    expect(getSupabaseServiceRoleKey()).toBe('service-key');
  });
});

describe('isLocalSupabaseUrl', () => {
  it('detects local stack URL', () => {
    expect(isLocalSupabaseUrl('http://127.0.0.1:54321')).toBe(true);
  });

  it('detects cloud URL', () => {
    expect(isLocalSupabaseUrl('https://xkkypitkvadiyazgheie.supabase.co')).toBe(false);
  });
});
