-- Integration type enum
CREATE TYPE integration_type AS ENUM (
  'google_calendar', 'mls_idx', 'crm', 'calendly', 'outlook', 'acuity'
);

-- Per-tenant integrations (credentials encrypted at app layer before storage)
CREATE TABLE integrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type integration_type NOT NULL,
  credentials jsonb,
  config jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  UNIQUE(tenant_id, type)
);

CREATE INDEX idx_integrations_tenant_id ON integrations(tenant_id);
