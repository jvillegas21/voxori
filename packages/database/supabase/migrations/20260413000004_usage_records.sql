-- Billing usage per billing period
CREATE TABLE usage_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  minutes_used int NOT NULL DEFAULT 0,
  minutes_included int NOT NULL DEFAULT 0,
  overage_minutes int NOT NULL DEFAULT 0,
  stripe_usage_record_id text,
  UNIQUE(tenant_id, period_start)
);

CREATE INDEX idx_usage_records_tenant_id ON usage_records(tenant_id);
