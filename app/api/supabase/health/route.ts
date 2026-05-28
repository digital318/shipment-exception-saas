import { testSupabaseConnection } from "@/lib/supabase-connection";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await testSupabaseConnection();

  return NextResponse.json(result, {
    status: result.connected ? 200 : 503,
  });
}
