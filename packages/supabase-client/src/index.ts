import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser/client-safe Supabase client. Uses the anon key only — safe to expose
 * to apps/web. Row Level Security policies (see supabase/migrations) are what
 * actually protect user data, not this key.
 */
export function createBrowserSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase URL and anon key are required to create a browser client.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

/**
 * Server-only Supabase client using the service-role key. NEVER import this
 * from apps/web client components — it bypasses Row Level Security entirely.
 * Intended for use inside apps/api only.
 */
export function createServiceRoleSupabaseClient(url: string, serviceRoleKey: string): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase URL and service role key are required.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type { SupabaseClient };
