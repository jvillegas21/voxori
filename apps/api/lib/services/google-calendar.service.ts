import { createHmac, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@voxori/database/types';
import {
  assertCredentialsEncryptionConfigured,
  CredentialsEncryptionError,
  decryptCredentials,
  encryptCredentials,
} from './credentials';

type DbClient = SupabaseClient<Database>;

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';
const GOOGLE_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
}

function getOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI ??
      `${process.env.API_BASE_URL ?? 'http://localhost:3002'}/integrations/google/callback`,
  };
}

function signState(payload: string): string {
  const secret = process.env.INTERNAL_API_SECRET ?? 'dev-state-secret';
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyState(state: string): { tenantId: string } | null {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;

  const expected = createHmac('sha256', process.env.INTERNAL_API_SECRET ?? 'dev-state-secret')
    .update(payload)
    .digest('base64url');

  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      tenantId?: string;
    };
    return parsed.tenantId ? { tenantId: parsed.tenantId } : null;
  } catch {
    return null;
  }
}

export function buildGoogleOAuthUrl(tenantId: string): string | null {
  const { clientId, redirectUri } = getOAuthConfig();
  if (!clientId) return null;

  const payload = Buffer.from(JSON.stringify({ tenantId, ts: Date.now() }), 'utf8').toString(
    'base64url'
  );
  const state = signState(payload);

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  return url.toString();
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens | null> {
  const { clientId, clientSecret } = getOAuthConfig();
  if (!clientId || !clientSecret) return null;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  return {
    access_token: data.access_token,
    refresh_token: refreshToken,
    expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
  };
}

async function getValidTokens(
  db: DbClient,
  tenantId: string
): Promise<GoogleTokens | null> {
  const { data: integration } = await db
    .from('integrations')
    .select('id, credentials')
    .eq('tenant_id', tenantId)
    .eq('type', 'google_calendar')
    .eq('is_active', true)
    .maybeSingle();

  if (!integration) return null;

  const creds = decryptCredentials(integration.credentials);
  if (!creds.access_token) return null;

  const expiresAt = creds.expires_at ? new Date(creds.expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) {
    return {
      access_token: creds.access_token,
      refresh_token: creds.refresh_token,
      expires_at: creds.expires_at,
    };
  }

  if (!creds.refresh_token) return null;

  const refreshed = await refreshAccessToken(creds.refresh_token);
  if (!refreshed) return null;

  try {
    assertCredentialsEncryptionConfigured();
  } catch (err) {
    if (err instanceof CredentialsEncryptionError) {
      console.warn('[google-calendar] token refresh not persisted — encryption key missing');
      return refreshed;
    }
    throw err;
  }

  await db
    .from('integrations')
    .update({
      credentials: encryptCredentials({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? creds.refresh_token,
        expires_at: refreshed.expires_at ?? '',
      }) as Json,
    })
    .eq('id', integration.id);

  return refreshed;
}

export async function exchangeGoogleCode(
  db: DbClient,
  code: string,
  state: string
): Promise<{ tenantId: string } | { error: string }> {
  const verified = verifyState(state);
  if (!verified) return { error: 'Invalid OAuth state' };

  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  if (!clientId || !clientSecret) return { error: 'Google OAuth not configured' };

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    return { error: 'Failed to exchange authorization code' };
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) return { error: 'Missing access token' };

  try {
    assertCredentialsEncryptionConfigured();
  } catch (err) {
    if (err instanceof CredentialsEncryptionError) {
      return { error: err.message };
    }
    throw err;
  }

  const credentials = encryptCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? '',
    expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : '',
  });

  const now = new Date().toISOString();
  const row = {
    tenant_id: verified.tenantId,
    type: 'google_calendar' as const,
    credentials,
    config: { provider: 'google' } as Json,
    is_active: true,
    last_synced_at: now,
    market_id: null,
  };

  const { data: existing } = await db
    .from('integrations')
    .select('id')
    .eq('tenant_id', verified.tenantId)
    .eq('type', 'google_calendar')
    .maybeSingle();

  if (existing) {
    const { error } = await db.from('integrations').update(row).eq('id', existing.id);
    if (error) return { error: 'Failed to save calendar credentials' };
  } else {
    const { error } = await db.from('integrations').insert(row);
    if (error) return { error: 'Failed to save calendar credentials' };
  }

  return { tenantId: verified.tenantId };
}

export async function checkCalendarAvailability(
  db: DbClient,
  tenantId: string,
  date: string,
  time: string,
  durationMinutes = 30
): Promise<{ available: boolean; source: 'google' | 'stub' }> {
  const tokens = await getValidTokens(db, tenantId);
  if (!tokens) return { available: true, source: 'stub' };

  const start = new Date(`${date}T${time}`);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const response = await fetch(GOOGLE_FREEBUSY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: 'primary' }],
    }),
  });

  if (!response.ok) return { available: true, source: 'stub' };

  const payload = (await response.json()) as {
    calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
  };

  const busy = payload.calendars?.primary?.busy ?? [];
  return { available: busy.length === 0, source: 'google' };
}

export async function createCalendarEvent(
  db: DbClient,
  tenantId: string,
  input: {
    date: string;
    time: string;
    durationMinutes?: number;
    summary: string;
    description?: string;
    attendeePhone?: string;
  }
): Promise<{ eventId: string | null; source: 'google' | 'stub' }> {
  const tokens = await getValidTokens(db, tenantId);
  if (!tokens) return { eventId: null, source: 'stub' };

  const start = new Date(`${input.date}T${input.time}`);
  const end = new Date(start.getTime() + (input.durationMinutes ?? 30) * 60_000);

  const response = await fetch(GOOGLE_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  });

  if (!response.ok) {
    console.warn('[google-calendar] create event failed', await response.text());
    return { eventId: null, source: 'stub' };
  }

  const event = (await response.json()) as { id?: string };
  return { eventId: event.id ?? null, source: 'google' };
}
