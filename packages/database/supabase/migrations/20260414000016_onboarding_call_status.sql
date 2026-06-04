-- Migration 016: Onboarding progress persistence + in-progress call status

ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'in_progress';

CREATE TABLE onboarding_steps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  step         text NOT NULL CHECK (step IN ('mls', 'calendar', 'crm', 'agent', 'number')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, step)
);

CREATE INDEX idx_onboarding_steps_tenant_id ON onboarding_steps(tenant_id);

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_steps_isolation" ON onboarding_steps
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());
