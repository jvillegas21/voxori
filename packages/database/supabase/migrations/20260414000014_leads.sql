-- Migration 014: Leads table — first-class qualified contact entity
-- Replaces webhook-only lead capture with queryable CRM-ready records.

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost'
);

CREATE TYPE crm_sync_state AS ENUM (
  'pending', 'synced', 'failed', 'skipped'
);

CREATE TABLE leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  agent_id          uuid REFERENCES agents(id)             ON DELETE SET NULL,
  call_id           uuid REFERENCES calls(id)              ON DELETE SET NULL,
  name              text NOT NULL,
  phone             text,
  email             text,
  budget_min        numeric(12,2),
  budget_max        numeric(12,2),
  timeline          text,
  financing_status  text,
  area_of_interest  text,
  beds              smallint,
  baths             numeric(4,1),
  status            lead_status NOT NULL DEFAULT 'new',
  crm_sync_state    crm_sync_state NOT NULL DEFAULT 'pending',
  crm_external_id   text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_tenant_id     ON leads(tenant_id);
CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_call_id       ON leads(call_id);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_isolation" ON leads
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());
