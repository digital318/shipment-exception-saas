import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

export async function requireSupabaseSession(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) {
    throw new Error("You must be signed in to continue.");
  }

  return { supabase, user };
}
