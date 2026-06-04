-- Launch blockers: Vapi phone linkage, tenant invitations, users RLS refinement

ALTER TABLE phone_numbers
  ADD COLUMN IF NOT EXISTS vapi_phone_id text,
  ADD COLUMN IF NOT EXISTS vapi_sync_error text;

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'team_member',
  token_hash text NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_tenant_invitations_pending_email
  ON tenant_invitations (tenant_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX idx_tenant_invitations_token_hash
  ON tenant_invitations (token_hash)
  WHERE status = 'pending';

CREATE INDEX idx_tenant_invitations_tenant_status
  ON tenant_invitations (tenant_id, status);

ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_invitations_select" ON tenant_invitations
  FOR SELECT USING (tenant_id = auth_tenant_id() OR is_super_admin());

CREATE POLICY "tenant_invitations_admin_write" ON tenant_invitations
  FOR ALL USING (
    is_super_admin()
    OR (
      tenant_id = auth_tenant_id()
      AND (auth.jwt() ->> 'role') IN ('client_admin', 'super_admin')
    )
  );

-- Users: members can read; only workspace admins mutate via client (tRPC uses service role)
DROP POLICY IF EXISTS "users_isolation" ON users;

CREATE POLICY "users_select_tenant" ON users
  FOR SELECT USING (tenant_id = auth_tenant_id() OR is_super_admin());

CREATE POLICY "users_admin_mutate" ON users
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      tenant_id = auth_tenant_id()
      AND (auth.jwt() ->> 'role') IN ('client_admin', 'super_admin')
    )
  );

CREATE POLICY "users_admin_update" ON users
  FOR UPDATE USING (
    is_super_admin()
    OR (
      tenant_id = auth_tenant_id()
      AND (auth.jwt() ->> 'role') IN ('client_admin', 'super_admin')
    )
  );

CREATE POLICY "users_admin_delete" ON users
  FOR DELETE USING (
    is_super_admin()
    OR (
      tenant_id = auth_tenant_id()
      AND (auth.jwt() ->> 'role') IN ('client_admin', 'super_admin')
    )
  );
