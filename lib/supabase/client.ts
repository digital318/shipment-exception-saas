import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
}

/** Browser Supabase client (singleton managed by @supabase/ssr). */
export function getSupabaseBrowserClient(): SupabaseClient {
  return createSupabaseBrowserClient();
}
