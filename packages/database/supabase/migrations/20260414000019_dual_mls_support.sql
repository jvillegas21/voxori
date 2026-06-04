-- Dual MLS support: multiple mls_idx integrations per tenant + originating_system_name on listings

-- integrations: allow one row per MLS market per tenant
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS market_id text;

UPDATE integrations
SET market_id = COALESCE(config->>'market_id', config->>'market', 'austin_central_texas')
WHERE type = 'mls_idx' AND market_id IS NULL;

ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_tenant_id_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS integrations_tenant_type_non_mls
  ON integrations (tenant_id, type)
  WHERE type <> 'mls_idx';

CREATE UNIQUE INDEX IF NOT EXISTS integrations_tenant_mls_market
  ON integrations (tenant_id, market_id)
  WHERE type = 'mls_idx' AND market_id IS NOT NULL;

-- listings: same mls_id may exist across different originating systems
ALTER TABLE listings ADD COLUMN IF NOT EXISTS originating_system_name text;

UPDATE listings
SET originating_system_name = 'unlock'
WHERE originating_system_name IS NULL;

ALTER TABLE listings ALTER COLUMN originating_system_name SET NOT NULL;
ALTER TABLE listings ALTER COLUMN originating_system_name SET DEFAULT 'unknown';

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_tenant_id_mls_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS listings_tenant_originating_mls
  ON listings (tenant_id, originating_system_name, mls_id);

CREATE INDEX IF NOT EXISTS idx_listings_tenant_originating
  ON listings (tenant_id, originating_system_name);
