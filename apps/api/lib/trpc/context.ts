import { createServerClient } from '@supabase/ssr';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim() ?? null;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Extract tenant_id and role from app_metadata (written by JWT claims trigger)
  const tenantId = (user?.app_metadata?.tenant_id as string | undefined) ?? null;
  const role     = (user?.app_metadata?.role     as string | undefined) ?? null;

  return { user, tenantId, role, supabase };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
