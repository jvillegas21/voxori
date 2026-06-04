import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@voxori/database/types';
import { retryPendingLeadSync } from './fub.service';

type DbClient = SupabaseClient<Database>;

export interface CrmRetryResult {
  leadId: string;
  tenantId: string;
  synced: boolean;
  externalId: string | null;
  error?: string;
}

/** Retry leads stuck in failed CRM sync state (env-gated on tenant FUB credentials). */
export async function retryFailedCrmSyncs(
  db: DbClient,
  options?: { limit?: number; tenantId?: string }
): Promise<CrmRetryResult[]> {
  const limit = options?.limit ?? 50;

  let query = db
    .from('leads')
    .select('id, tenant_id')
    .eq('crm_sync_state', 'failed')
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (options?.tenantId) {
    query = query.eq('tenant_id', options.tenantId);
  }

  const { data: leads, error } = await query;
  if (error) {
    console.warn('[crm-retry] query failed', error.message);
    return [];
  }

  const results: CrmRetryResult[] = [];

  for (const lead of leads ?? []) {
    const outcome = await retryPendingLeadSync(db, lead.tenant_id, lead.id);
    results.push({
      leadId: lead.id,
      tenantId: lead.tenant_id,
      synced: outcome.synced,
      externalId: outcome.externalId,
      error: outcome.error,
    });
  }

  return results;
}
