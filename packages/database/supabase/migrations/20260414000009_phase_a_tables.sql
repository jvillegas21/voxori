-- Migration 009: Phase A/B tables
-- Adds bookings, listings, webhook_logs, audit_log, notification_prefs.
-- All tables use RLS with the auth_tenant_id() and is_super_admin() helpers
-- defined in migration 005.

-- ================================================================
-- bookings: calendar appointments created by the book-showing tool
-- ================================================================
CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'cancelled', 'completed'
);

CREATE TABLE bookings (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  agent_id         uuid NOT NULL REFERENCES agents(id)   ON DELETE CASCADE,
  call_id          uuid REFERENCES calls(id)             ON DELETE SET NULL,
  contact_name     text NOT NULL,
  contact_phone    text NOT NULL,
  showing_address  text NOT NULL,
  scheduled_at     timestamptz NOT NULL,
  status           booking_status NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_tenant_id    ON bookings(tenant_id);
CREATE INDEX idx_bookings_agent_id     ON bookings(agent_id);
CREATE INDEX idx_bookings_scheduled_at ON bookings(scheduled_at DESC);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_isolation" ON bookings
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());

-- ================================================================
-- listings: MLS property cache populated by realtor integrations
-- ================================================================
CREATE TABLE listings (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id)       ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integrations(id)  ON DELETE CASCADE,
  mls_id         text NOT NULL,
  address        text NOT NULL,
  price          numeric(12,2),
  bedrooms       smallint,
  bathrooms      numeric(4,1),
  sqft           int,
  status         text NOT NULL DEFAULT 'active',  -- active | pending | sold
  raw_data       jsonb,
  synced_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, mls_id)
);

CREATE INDEX idx_listings_tenant_id     ON listings(tenant_id);
CREATE INDEX idx_listings_tenant_status ON listings(tenant_id, status);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_isolation" ON listings
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());

-- ================================================================
-- webhook_logs: inbound webhook audit trail for integration debugging
-- ================================================================
CREATE TABLE webhook_logs (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        uuid REFERENCES tenants(id) ON DELETE SET NULL,
  integration_type text NOT NULL,    -- 'vapi' | 'stripe' | 'twilio'
  event_type       text NOT NULL,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status           text NOT NULL DEFAULT 'received',  -- received | processed | failed
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_logs_tenant_created ON webhook_logs(tenant_id, created_at DESC);
CREATE INDEX idx_webhook_logs_type           ON webhook_logs(integration_type, event_type);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_logs_isolation" ON webhook_logs
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());

-- ================================================================
-- audit_log: immutable action log (insert-only from service role)
-- Captures admin actions, impersonation, plan changes, etc.
-- ================================================================
CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id uuid,          -- NULL for system/service-role actions
  actor_role    text,
  action        text NOT NULL,  -- e.g. 'agent.update', 'tenant.impersonate'
  resource_type text NOT NULL,  -- 'agent' | 'tenant' | 'call' etc.
  resource_id   text,
  tenant_id     uuid REFERENCES tenants(id) ON DELETE SET NULL,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_tenant_created ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_action         ON audit_log(action);
CREATE INDEX idx_audit_log_actor          ON audit_log(actor_user_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Tenants can read their own audit entries; super_admin reads all
CREATE POLICY "audit_log_read" ON audit_log
  FOR SELECT USING (tenant_id = auth_tenant_id() OR is_super_admin());
-- Service role inserts; no JWT check needed
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (true);

-- ================================================================
-- notification_prefs: per-user notification settings
-- ================================================================
CREATE TABLE notification_prefs (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  missed_call_email   boolean NOT NULL DEFAULT true,
  daily_digest_email  boolean NOT NULL DEFAULT false,
  weekly_report_email boolean NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_notification_prefs_tenant_id ON notification_prefs(tenant_id);

ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_prefs_own" ON notification_prefs
  FOR ALL USING (
    user_id = auth.uid()
    OR tenant_id = auth_tenant_id()
    OR is_super_admin()
  );
