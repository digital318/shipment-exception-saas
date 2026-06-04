"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { mapDbDemoRequest, type DbDemoRequest } from "@/lib/marketing/mappers";
import type {
  DemoRequest,
  DemoRequestInput,
  DemoRequestStatus,
} from "@/lib/marketing/types";

const DEMO_SUBMITTED_EVENT = "demo_request_submitted";

function validateInput(input: DemoRequestInput): DemoRequestInput {
  const name = input.name.trim();
  const company = input.company.trim();
  const email = input.email.trim();

  if (name.length < 2) throw new Error("Please enter your name.");
  if (company.length < 2) throw new Error("Please enter your company name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!input.monthlyVolume.trim()) {
    throw new Error("Please select your monthly shipment volume.");
  }

  return {
    ...input,
    name,
    company,
    email,
    phone: input.phone?.trim(),
    message: input.message?.trim(),
    monthlyVolume: input.monthlyVolume,
  };
}

export async function submitDemoRequest(
  input: DemoRequestInput,
): Promise<{ ok: true; id: string }> {
  const validated = validateInput(input);

  if (!isSupabaseConfigured()) {
    return { ok: true, id: "local" };
  }

  const supabase = await createSupabaseServerClient();

  const { data: row, error } = await supabase
    .from("demo_requests")
    .insert({
      name: validated.name,
      company: validated.company,
      email: validated.email,
      phone: validated.phone || null,
      monthly_volume: validated.monthlyVolume,
      message: validated.message || null,
      status: "New",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const activityMessage = `Demo request submitted by ${validated.name} (${validated.company})`;
  const { error: activityError } = await supabase.from("demo_request_activity").insert({
    demo_request_id: row.id,
    event_type: DEMO_SUBMITTED_EVENT,
    message: activityMessage,
  });

  if (activityError) throw new Error(activityError.message);

  return { ok: true, id: row.id };
}

export async function fetchDemoRequests(): Promise<DemoRequest[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("demo_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data as DbDemoRequest[]).map(mapDbDemoRequest);
}

export async function updateDemoRequestStatus(
  id: string,
  status: DemoRequestStatus,
): Promise<DemoRequest> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("demo_requests")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const message = `Status updated to ${status}`;
  await supabase.from("demo_request_activity").insert({
    demo_request_id: id,
    event_type: "demo_request_status_changed",
    message,
  });

  return mapDbDemoRequest(data as DbDemoRequest);
}
