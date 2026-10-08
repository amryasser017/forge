import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let client: SupabaseClient | null = null;

/** Service-role client. Server only: the key never reaches the browser and RLS denies every other role. */
export function db(): SupabaseClient {
  if (client) return client;
  const e = env();
  if (!e.supabaseUrl || !e.serviceKey) throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  client = createClient(e.supabaseUrl, e.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Unwrap a Supabase response or throw a readable error. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
