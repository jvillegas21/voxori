import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Json } from '@voxori/database';

export const authRouter = router({
  me: tenantProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();

    const [userResult, tenantResult] = await Promise.all([
      db.from('users')
        .select('id, email, full_name, role, tenant_id, created_at')
        .eq('id', ctx.user.id)
        .single(),
      db.from('tenants')
        .select('id, name, subdomain, plan, branding, stripe_customer_id')
        .eq('id', ctx.tenantId)
        .single(),
    ]);

    // Explicitly type the tenant result to ensure stripe_customer_id is included
    // (Supabase-JS select inference may not propagate all fields through tRPC)
    const tenant = tenantResult.data as {
      id: string;
      name: string;
      subdomain: string;
      plan: string;
      branding: Json | null;
      stripe_customer_id: string | null;
    } | null;

    return {
      user:   userResult.data,
      tenant,
    };
  }),
});
