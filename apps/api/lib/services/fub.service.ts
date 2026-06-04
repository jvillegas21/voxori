import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@voxori/database/types';
import { decryptCredentials } from './credentials';

type DbClient = SupabaseClient<Database>;

export interface FubLeadPayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  areaOfInterest?: string | null;
  timeline?: string | null;
}

function getFubBaseUrl(): string {
  return process.env.FOLLOW_UP_BOSS_API_BASE_URL ?? 'https://api.followupboss.com/v1';
}

function buildFubBasicAuth(apiKey: string): string {
  return Buffer.from(`${apiKey}:`).toString('base64');
}

/** Dev-only fallback when tenant has no CRM integration row (local testing). */
function getDevFallbackFubApiKey(): string | null {
  if (process.env.NODE_ENV === 'production') return null;
  const key = process.env.FOLLOW_UP_BOSS_API_KEY?.trim();
  return key || null;
}

export async function validateFubApiKey(
  apiKey: string
): Promise<{ valid: true } | { valid: false; message: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, message: 'API key is required' };
  }

  try {
    const response = await fetch(`${getFubBaseUrl()}/identity`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${buildFubBasicAuth(trimmed)}`,
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, message: 'Invalid Follow Up Boss API key' };
    }

    return {
      valid: false,
      message: 'Could not verify Follow Up Boss API key. Try again later.',
    };
  } catch {
    return {
      valid: false,
      message: 'Could not reach Follow Up Boss. Check your connection and try again.',
    };
  }
}

async function getFubApiKey(db: DbClient, tenantId: string): Promise<string | null> {
  const { data: integration } = await db
    .from('integrations')
    .select('credentials, is_active')
    .eq('tenant_id', tenantId)
    .eq('type', 'crm')
    .eq('is_active', true)
    .maybeSingle();

  if (integration) {
    const creds = decryptCredentials(integration.credentials);
    const tenantKey = creds.api_key ?? creds.apiKey ?? null;
    if (tenantKey) return tenantKey;
  }

  return getDevFallbackFubApiKey();
}

export async function pushLeadToFub(
  db: DbClient,
  tenantId: string,
  leadId: string,
  payload: FubLeadPayload
): Promise<{ synced: boolean; externalId: string | null; error?: string }> {
  const apiKey = await getFubApiKey(db, tenantId);
  if (!apiKey) {
    await db
      .from('leads')
      .update({ crm_sync_state: 'skipped', updated_at: new Date().toISOString() })
      .eq('id', leadId);
    return { synced: false, externalId: null, error: 'CRM not connected' };
  }

  const auth = buildFubBasicAuth(apiKey);
  const body = {
    source: 'Voxori',
    type: 'General Inquiry',
    person: {
      name: payload.name,
      phones: payload.phone ? [{ value: payload.phone, type: 'mobile' }] : [],
      emails: payload.email ? [{ value: payload.email, type: 'home' }] : [],
    },
    message: [payload.notes, payload.areaOfInterest, payload.timeline].filter(Boolean).join(' | '),
  };

  try {
    const response = await fetch(`${getFubBaseUrl()}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await db
        .from('leads')
        .update({ crm_sync_state: 'failed', updated_at: new Date().toISOString() })
        .eq('id', leadId);
      return { synced: false, externalId: null, error: errorText.slice(0, 200) };
    }

    const result = (await response.json()) as { id?: number | string };
    const externalId = result.id != null ? String(result.id) : null;

    await db
      .from('leads')
      .update({
        crm_sync_state: 'synced',
        crm_external_id: externalId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    await db
      .from('integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('type', 'crm');

    return { synced: true, externalId };
  } catch (err) {
    await db
      .from('leads')
      .update({ crm_sync_state: 'failed', updated_at: new Date().toISOString() })
      .eq('id', leadId);
    return { synced: false, externalId: null, error: String(err) };
  }
}

/** Retry-safe sync for leads stuck in pending/failed state. */
export async function retryPendingLeadSync(db: DbClient, tenantId: string, leadId: string) {
  const { data: lead } = await db
    .from('leads')
    .select('id, name, phone, email, notes, area_of_interest, timeline, crm_sync_state, crm_external_id')
    .eq('tenant_id', tenantId)
    .eq('id', leadId)
    .maybeSingle();

  if (!lead || lead.crm_sync_state === 'synced') {
    return { synced: false, externalId: lead?.crm_external_id ?? null };
  }

  return pushLeadToFub(db, tenantId, leadId, {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    notes: lead.notes,
    areaOfInterest: lead.area_of_interest,
    timeline: lead.timeline,
  });
}
