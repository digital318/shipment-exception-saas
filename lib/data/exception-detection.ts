import { DEFAULT_AUTO_EXCEPTION_OWNER } from "@/lib/constants";
import {
  buildExceptionFromShipment,
  formatNowLabel,
  generateExceptionId,
} from "@/lib/exception-utils";
import type { AppDataSnapshot } from "@/lib/data/types";
import type { DbShipmentWithCustomer } from "@/lib/database.types";
import {
  evaluateShipmentsForExceptions,
  type ExceptionDetectionResult,
  type ShipmentForDetection,
} from "@/lib/exception-engine";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { ActivityItem, ExceptionRecord, Shipment, ShipmentStatus } from "@/lib/types";
import { createAutoDetectedExceptionInSupabase } from "./mutations";
import {
  buildExceptionNotificationInput,
} from "./notification-rules";
import { createNotification } from "./notifications";

export type DetectionRunResult = {
  created: ExceptionDetectionResult[];
  source: "rpc" | "client" | "none";
};

type RpcDetectionRow = {
  exception_id: string;
  shipment_number: string;
  severity: string;
  title: string;
  rule_applied: string;
};

async function notifyRpcDetections(
  organizationId: string,
  rows: RpcDetectionRow[],
): Promise<void> {
  for (const row of rows) {
    const input = buildExceptionNotificationInput(organizationId, {
      exceptionId: row.exception_id,
      shipmentNumber: row.shipment_number,
      title: row.title,
      severity: row.severity as ExceptionDetectionResult["severity"],
    });
    if (!input) continue;

    try {
      await createNotification(input);
    } catch {
      // Non-blocking for detection pipeline.
    }
  }
}

function mapDbShipmentToDetectionInput(row: DbShipmentWithCustomer): ShipmentForDetection {
  return {
    shipmentNumber: row.shipment_number,
    shipmentUuid: row.id,
    status: row.status as ShipmentStatus,
    delayHours: row.delay_hours,
    carrier: row.carrier,
    customer: row.customer?.name ?? "Unknown customer",
    origin: row.origin,
    destination: row.destination,
  };
}

function mapShipmentToDetectionInput(shipment: Shipment): ShipmentForDetection {
  return {
    shipmentNumber: shipment.id,
    status: shipment.status,
    delayHours: shipment.delayHours,
    carrier: shipment.carrier,
    customer: shipment.customer,
    origin: shipment.origin,
    destination: shipment.destination,
  };
}

function openExceptionShipmentNumbers(exceptions: ExceptionRecord[]): Set<string> {
  return new Set(
    exceptions.filter((e) => e.status !== "Resolved").map((e) => e.shipmentId),
  );
}

async function runRpcDetection(): Promise<{
  created: ExceptionDetectionResult[];
  rows: RpcDetectionRow[];
} | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("detect_shipment_exceptions");

  if (error) {
    if (error.code === "PGRST202" || error.message.includes("detect_shipment_exceptions")) {
      return null;
    }
    throw error;
  }

  const rows = (data ?? []) as RpcDetectionRow[];
  return {
    rows,
    created: rows.map((row) => ({
      shipmentNumber: row.shipment_number,
      severity: row.severity as ExceptionDetectionResult["severity"],
      title: row.title,
      delayReason: row.title,
      rule: row.rule_applied as ExceptionDetectionResult["rule"],
    })),
  };
}

async function runClientSideDetection(
  organizationId: string,
): Promise<ExceptionDetectionResult[]> {
  const supabase = getSupabaseClient();

  const [shipmentsResult, exceptionsResult] = await Promise.all([
    supabase
      .from("shipments")
      .select(
        `
        *,
        customer:customers (
          id,
          name,
          contact_name,
          sla_target_percent
        )
      `,
      )
      .eq("organization_id", organizationId)
      .neq("status", "Delivered"),
    supabase
      .from("exceptions")
      .select("id, shipment_id, resolved_at, shipment:shipments (shipment_number)")
      .eq("organization_id", organizationId)
      .is("resolved_at", null),
  ]);

  if (shipmentsResult.error) throw shipmentsResult.error;
  if (exceptionsResult.error) throw exceptionsResult.error;

  const openNumbers = new Set<string>();
  for (const row of exceptionsResult.data ?? []) {
    const shipment = row.shipment as { shipment_number?: string } | null;
    if (shipment?.shipment_number) {
      openNumbers.add(shipment.shipment_number);
    }
  }

  const candidates = evaluateShipmentsForExceptions(
    ((shipmentsResult.data ?? []) as DbShipmentWithCustomer[]).map(mapDbShipmentToDetectionInput),
    openNumbers,
  );

  const created: ExceptionDetectionResult[] = [];

  for (const detection of candidates) {
    if (!detection.shipmentUuid) continue;

    await createAutoDetectedExceptionInSupabase(
      {
        shipmentUuid: detection.shipmentUuid,
        shipmentNumber: detection.shipmentNumber,
        title: detection.title,
        severity: detection.severity,
        delayReason: detection.delayReason,
        owner: DEFAULT_AUTO_EXCEPTION_OWNER,
      },
      organizationId,
    );

    created.push(detection);
  }

  return created;
}

/**
 * Run the exception detection engine against Supabase for the given organization.
 * Prefers the database RPC when available; falls back to client-side evaluation.
 */
export async function runExceptionDetection(
  organizationId: string,
): Promise<DetectionRunResult> {
  if (!isSupabaseConfigured() || !organizationId) {
    return { created: [], source: "none" };
  }

  const rpcResult = await runRpcDetection();
  if (rpcResult !== null) {
    if (rpcResult.rows.length > 0) {
      await notifyRpcDetections(organizationId, rpcResult.rows);
    }
    return { created: rpcResult.created, source: "rpc" };
  }

  const created = await runClientSideDetection(organizationId);
  return { created, source: "client" };
}

/**
 * In-memory detection for mock/offline mode — does not persist.
 */
export function runInMemoryExceptionDetection(
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
): ExceptionDetectionResult[] {
  return evaluateShipmentsForExceptions(
    shipments.map(mapShipmentToDetectionInput),
    openExceptionShipmentNumbers(exceptions),
  );
}

export function applyInMemoryDetections(
  snapshot: AppDataSnapshot,
  detections: ExceptionDetectionResult[],
): AppDataSnapshot {
  if (detections.length === 0) return snapshot;

  const newExceptions: ExceptionRecord[] = [];
  const newActivity: ActivityItem[] = [];

  for (const detection of detections) {
    const shipment = snapshot.shipments.find((s) => s.id === detection.shipmentNumber);
    if (!shipment) continue;

    const record = buildExceptionFromShipment(shipment, {
      id: generateExceptionId([...snapshot.exceptions, ...newExceptions]),
      title: detection.title,
      severity: detection.severity,
      delayReason: detection.delayReason,
      owner: DEFAULT_AUTO_EXCEPTION_OWNER,
      status: "Open",
    });

    newExceptions.push(record);
    newActivity.push({
      time: formatNowLabel(),
      actor: "System",
      event: `Auto-detected ${detection.severity} exception on ${detection.shipmentNumber} — ${detection.title}`,
      shipmentId: detection.shipmentNumber,
      type: "escalation",
    });
    if (detection.severity === "Critical" || detection.severity === "High") {
      newActivity.push({
        time: formatNowLabel(),
        actor: "System",
        event: `Notification: ${detection.severity} exception — ${detection.shipmentNumber}`,
        shipmentId: detection.shipmentNumber,
        type: "alert",
      });
    }
  }

  const exceptions = [...newExceptions, ...snapshot.exceptions];
  const exceptionByShipment = new Map(
    exceptions.map((exc) => [exc.shipmentId, exc]),
  );

  const shipments = snapshot.shipments.map((shipment) => {
    const exc = exceptionByShipment.get(shipment.id);
    if (!exc || exc.status === "Resolved") return shipment;
    return {
      ...shipment,
      severity: exc.severity,
      issueStatus: exc.status,
      exception: exc.title,
      delayReason: exc.delayReason,
    };
  });

  return {
    ...snapshot,
    shipments,
    exceptions,
    activity: [...newActivity, ...snapshot.activity],
  };
}
