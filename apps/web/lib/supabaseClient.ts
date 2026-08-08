import { createBrowserSupabaseClient } from "@platform/supabase-client";

/** Browser-safe Supabase client — anon key only, RLS-protected. */
export const supabase = createBrowserSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);
