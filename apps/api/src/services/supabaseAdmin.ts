import { createServiceRoleSupabaseClient } from "@trutalk/supabase-client";
import { env } from "../config/env";

/** Server-only Supabase client (service role). Used exclusively inside apps/api. */
export const supabaseAdmin = createServiceRoleSupabaseClient(env.supabaseUrl, env.supabaseServiceRoleKey);
