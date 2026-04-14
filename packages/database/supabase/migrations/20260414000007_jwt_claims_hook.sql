-- Migration 007: JWT custom claims hook
-- Writes tenant_id + role into raw_app_meta_data so auth_tenant_id() and
-- is_super_admin() RLS helpers (defined in migration 005) work correctly.
--
-- Design: The trigger fires BEFORE INSERT/UPDATE on auth.users.
-- On initial INSERT (sign-up), public.users does not yet exist, so the trigger
-- is a no-op (guarded by IF v_tenant_id IS NOT NULL). After tenant bootstrap
-- inserts the public.users row, the bootstrap function explicitly UPDATEs
-- raw_app_meta_data, which fires the UPDATE trigger and populates claims.

CREATE OR REPLACE FUNCTION public.set_jwt_claims()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_role      text;
BEGIN
  -- Look up the public.users row for this auth user
  SELECT tenant_id, role::text
    INTO v_tenant_id, v_role
    FROM public.users
   WHERE id = NEW.id;

  IF v_tenant_id IS NOT NULL THEN
    -- Merge our claims into whatever is already in raw_app_meta_data
    NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
           'tenant_id', v_tenant_id::text,
           'role',      v_role
         );
  END IF;

  RETURN NEW;
END;
$$;

-- Fire BEFORE INSERT so claims are in the JWT from the very first token
DROP TRIGGER IF EXISTS trg_set_jwt_claims_insert ON auth.users;
CREATE TRIGGER trg_set_jwt_claims_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.set_jwt_claims();

-- Fire BEFORE UPDATE of raw_app_meta_data so bootstrap refresh works
DROP TRIGGER IF EXISTS trg_set_jwt_claims_update ON auth.users;
CREATE TRIGGER trg_set_jwt_claims_update
  BEFORE UPDATE OF raw_app_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.set_jwt_claims();
