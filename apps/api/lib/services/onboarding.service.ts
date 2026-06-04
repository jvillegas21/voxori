import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@voxori/database/types';

export const ONBOARDING_STEPS = ['mls', 'calendar', 'crm', 'agent', 'number'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  mls: 'Connect MLS',
  calendar: 'Connect calendar',
  crm: 'Connect CRM',
  agent: 'Configure voice agent',
  number: 'Get phone number',
};

type DbClient = SupabaseClient<Database>;

export async function getCompletedSteps(
  db: DbClient,
  tenantId: string
): Promise<Set<OnboardingStep>> {
  const completed = new Set<OnboardingStep>();

  const { data: rows } = await db
    .from('onboarding_steps')
    .select('step')
    .eq('tenant_id', tenantId);

  for (const row of rows ?? []) {
    if (ONBOARDING_STEPS.includes(row.step as OnboardingStep)) {
      completed.add(row.step as OnboardingStep);
    }
  }

  const { data: integrations } = await db
    .from('integrations')
    .select('type, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  for (const integration of integrations ?? []) {
    if (integration.type === 'mls_idx') completed.add('mls');
    if (integration.type === 'google_calendar') completed.add('calendar');
    if (integration.type === 'crm') completed.add('crm');
  }

  const { count: phoneCount } = await db
    .from('phone_numbers')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if ((phoneCount ?? 0) > 0) completed.add('number');

  const { data: agents } = await db
    .from('agents')
    .select('config')
    .eq('tenant_id', tenantId)
    .limit(1);

  const config = (agents?.[0]?.config ?? {}) as Record<string, unknown>;
  if (config.greeting || config.disclosure_text || config.voice_preset) {
    completed.add('agent');
  }

  return completed;
}

export async function markStepComplete(
  db: DbClient,
  tenantId: string,
  step: OnboardingStep
): Promise<void> {
  const { error } = await db.from('onboarding_steps').upsert(
    {
      tenant_id: tenantId,
      step,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,step' }
  );

  if (error) {
    throw new Error(`Failed to mark onboarding step "${step}": ${error.message}`);
  }
}
