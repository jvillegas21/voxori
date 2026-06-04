import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseAnonKey,
  getSupabasePublicUrl,
  getSupabaseServiceRoleKey,
} from '@voxori/shared/env/supabase';
import type { Database } from './types';

const supabaseUrl = getSupabasePublicUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// Browser client — use in React components and client-side code
export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Server client using service role — use in API routes and server actions only
export function createServiceRoleClient() {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
