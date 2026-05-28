import {
  initialExceptionRecords as mockExceptions,
  recentActivity as mockActivity,
} from "@/lib/mock-data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  DbActivityEventWithRelations,
  DbExceptionWithRelations,
} from "@/lib/database.types";
import type { ActivityItem, ExceptionRecord } from "@/lib/types";
import { mapActivityEvents, mapExceptionRecords } from "./mappers";
import type { DataResult } from "./types";

export type ExceptionsBundle = {
  exceptions: ExceptionRecord[];
  activity: ActivityItem[];
};

async function fetchExceptionsFromSupabase(): Promise<ExceptionsBundle> {
  const supabase = getSupabaseClient();

  const [exceptionsResult, activityResult] = await Promise.all([
    supabase
      .from("exceptions")
      .select(
        `
        *,
        shipment:shipments (
          id,
          shipment_number,
          carrier,
          origin,
          destination,
          customer:customers (
            name
          )
        ),
        exception_notes (*)
      `,
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select(
        `
        *,
        exception:exceptions (
          owner,
          shipment:shipments (
            shipment_number
          )
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (exceptionsResult.error) throw exceptionsResult.error;
  if (activityResult.error) throw activityResult.error;

  return {
    exceptions: mapExceptionRecords(
      (exceptionsResult.data ?? []) as DbExceptionWithRelations[],
    ),
    activity: mapActivityEvents(
      (activityResult.data ?? []) as DbActivityEventWithRelations[],
    ),
  };
}

export async function fetchExceptions(): Promise<DataResult<ExceptionRecord[]>> {
  const bundle = await fetchExceptionsBundle();
  return {
    data: bundle.data.exceptions,
    source: bundle.source,
    error: bundle.error,
  };
}

export async function fetchActivityEvents(): Promise<DataResult<ActivityItem[]>> {
  const bundle = await fetchExceptionsBundle();
  return {
    data: bundle.data.activity,
    source: bundle.source,
    error: bundle.error,
  };
}

export async function fetchExceptionsBundle(): Promise<DataResult<ExceptionsBundle>> {
  if (!isSupabaseConfigured()) {
    return {
      data: {
        exceptions: mockExceptions,
        activity: mockActivity,
      },
      source: "mock",
    };
  }

  try {
    const data = await fetchExceptionsFromSupabase();
    return { data, source: "supabase" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load exceptions.";
    return {
      data: {
        exceptions: mockExceptions,
        activity: mockActivity,
      },
      source: "mock",
      error: message,
    };
  }
}
