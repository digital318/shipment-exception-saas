import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export { isSupabaseConfigured, getSupabaseEnv } from "@/lib/supabase/env";

export function getSupabaseClient(): SupabaseClient {
  return getSupabaseBrowserClient();
}
