-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_tool_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Helper function: get tenant_id from JWT
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Helper function: check if current user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT (auth.jwt() ->> 'role') = 'super_admin';
$$ LANGUAGE sql STABLE;

-- tenants: each tenant sees only their own row; super_admin sees all
CREATE POLICY "tenants_isolation" ON tenants
  FOR ALL USING (id = auth_tenant_id() OR is_super_admin());

-- users: see only users in your tenant; super_admin sees all
CREATE POLICY "users_isolation" ON users
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());

-- agents: see only agents in your tenant
CREATE POLICY "agents_isolation" ON agents
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());

-- phone_numbers: scoped to tenant
CREATE POLICY "phone_numbers_isolation" ON phone_numbers
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());

-- calls: scoped to tenant
CREATE POLICY "calls_isolation" ON calls
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());

-- call_tool_events: accessible if parent call is accessible
CREATE POLICY "call_tool_events_isolation" ON call_tool_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_tool_events.call_id
        AND (calls.tenant_id = auth_tenant_id() OR is_super_admin())
    )
  );

-- integrations: scoped to tenant
CREATE POLICY "integrations_isolation" ON integrations
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());

-- usage_records: scoped to tenant
CREATE POLICY "usage_records_isolation" ON usage_records
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());
