-- Migration 015: Reserved parent_tenant_id for brokerage parent-child orgs (v1.2)
-- Column is nullable and unused in MVP; satisfies PRD multi-tenancy stub requirement.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS parent_tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_parent_tenant_id ON tenants(parent_tenant_id);

COMMENT ON COLUMN tenants.parent_tenant_id IS
  'Brokerage parent org reference. Reserved for v1.2 agency tier; unused in MVP.';
