const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

function missingEnvMessage(name: string): string {
  return (
    `Missing ${name}. ` +
    `Local dev: run \`pnpm db:local\` then \`pnpm db:sync-env\` (uses ${LOCAL_SUPABASE_URL}). ` +
    'Deployed: set in Vercel project env (e.g. https://<project-ref>.supabase.co). ' +
    'See .env.example and apps/*/.env.local.example.'
  );
}

/** Public Supabase URL — browser-safe, from NEXT_PUBLIC_SUPABASE_URL. */
export function getSupabasePublicUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error(missingEnvMessage('NEXT_PUBLIC_SUPABASE_URL'));
  }
  return url;
}

/** Anon key for client-side / RLS-scoped Supabase access. */
export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error(missingEnvMessage('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
  }
  return key;
}

/** Service role key — server-only; bypasses RLS. */
export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(missingEnvMessage('SUPABASE_SERVICE_ROLE_KEY'));
  }
  return key;
}

/** True when URL points at the local Supabase stack (Docker). */
export function isLocalSupabaseUrl(url = getSupabasePublicUrl()): boolean {
  return url.startsWith(LOCAL_SUPABASE_URL) || url.includes('127.0.0.1:54321');
}
