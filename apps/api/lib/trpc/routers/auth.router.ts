import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';

export const authRouter = router({
  me: tenantProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();

    const [userResult, tenantResult] = await Promise.all([
      db.from('users')
        .select('id, email, full_name, role, tenant_id, created_at')
        .eq('id', ctx.user.id)
        .single(),
      db.from('tenants')
        .select('id, name, subdomain, plan, branding')
        .eq('id', ctx.tenantId)
        .single(),
    ]);

    return {
      user:   userResult.data,
      tenant: tenantResult.data,
    };
  }),
});
