import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type SupabaseConnectionResult = {
  configured: boolean;
  connected: boolean;
  error?: string;
};

export async function testSupabaseConnection(): Promise<SupabaseConnectionResult> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      error: "Supabase environment variables are not configured.",
    };
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      return {
        configured: true,
        connected: false,
        error: error.message,
      };
    }

    return { configured: true, connected: true };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Connection failed.",
    };
  }
}
