-- Pre-launch waitlist signups (public marketing page)

CREATE TABLE waitlist_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  source     text NOT NULL DEFAULT 'web',
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_entries_created_at ON waitlist_entries(created_at DESC);

-- Service role only — no tenant RLS (public marketing capture)
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_service_role_only" ON waitlist_entries
  FOR ALL
  USING (false)
  WITH CHECK (false);
