import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@voxori/database';

type Db = SupabaseClient<Database>;

/** Prefer tenant's active phone_numbers row; fall back to platform TWILIO_PHONE_NUMBER. */
export async function resolveTenantSmsFromNumber(
  db: Db,
  tenantId: string
): Promise<string | null> {
  const { data: row } = await db
    .from('phone_numbers')
    .select('number')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (row?.number?.trim()) return row.number.trim();

  const fallback = process.env.TWILIO_PHONE_NUMBER?.trim();
  return fallback || null;
}
