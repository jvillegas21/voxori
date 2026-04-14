-- Migration 008: Tenant bootstrap RPC function
-- Called from POST /auth/bootstrap after Supabase signUp.
-- Atomically creates tenant + public.user rows and writes JWT claims.
--
-- Idempotency: The API route checks public.users first; this function
-- is only called when no row exists. The subdomain uniqueness loop
-- ensures concurrent signups with the same subdomain get suffixed values.

CREATE OR REPLACE FUNCTION public.bootstrap_new_tenant(
  p_user_id     uuid,
  p_email       text,
  p_full_name   text,
  p_tenant_name text,
  p_subdomain   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_subdomain text := lower(regexp_replace(p_subdomain, '[^a-z0-9-]', '-', 'g'));
  v_suffix    int  := 0;
BEGIN
  -- Ensure subdomain uniqueness by appending numeric suffix if needed
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.tenants WHERE subdomain = v_subdomain
    );
    v_suffix    := v_suffix + 1;
    v_subdomain := lower(regexp_replace(p_subdomain, '[^a-z0-9-]', '-', 'g')) || '-' || v_suffix::text;
  END LOOP;

  -- 1. Create tenant record
  INSERT INTO public.tenants (name, subdomain, plan)
  VALUES (p_tenant_name, v_subdomain, 'starter')
  RETURNING id INTO v_tenant_id;

  -- 2. Create public.users record linking to auth.users
  INSERT INTO public.users (id, tenant_id, email, full_name, role)
  VALUES (p_user_id, v_tenant_id, p_email, p_full_name, 'client_admin');

  -- 3. Write JWT claims into auth.users.raw_app_meta_data.
  --    This UPDATE fires trg_set_jwt_claims_update (migration 007) which
  --    re-reads public.users (now present) and merges tenant_id + role.
  UPDATE auth.users
     SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object(
            'tenant_id', v_tenant_id::text,
            'role',      'client_admin'
          )
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'tenantId',  v_tenant_id,
    'userId',    p_user_id,
    'subdomain', v_subdomain
  );
END;
$$;
