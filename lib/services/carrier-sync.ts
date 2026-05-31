import { assignPlaybook } from "@/lib/playbooks";
import {
  generateTrackingNumber,
  getCarrierProviderForName,
  getTrackingSnapshot,
  mapCarrierStatusToShipmentStatus,
  resolveCarrierKey,
} from "@/lib/carriers";
import { formatDisplayDate } from "@/lib/data/format";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  formatUnknownError,
  logSimulateExceptionError,
  throwReadableError,
} from "@/lib/supabase/format-error";
import type {
  CarrierKey,
  CarrierShipmentEvent,
  CarrierStatus,
  ExceptionRecord,
  Shipment,
  ShipmentStatus,
} from "@/lib/types";
import { createCarrierSyncExceptionInSupabase } from "@/lib/data/mutations";

export type ShipmentSyncInput = {
  shipmentNumber: string;
  carrier: string;
  trackingNumber?: string | null;
  currentStatus: ShipmentStatus;
  currentCarrierStatus?: CarrierStatus | null;
  shipmentUuid?: string;
};

export type ShipmentSyncResult = {
  shipmentNumber: string;
  carrier: string;
  trackingNumber: string;
  previousCarrierStatus: CarrierStatus | null;
  carrierStatus: CarrierStatus;
  shipmentStatus: ShipmentStatus;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  lastCarrierUpdate: string;
  statusChanged: boolean;
  exceptionCreated: boolean;
  exceptionTitle?: string;
  events: CarrierShipmentEvent[];
  skipped: boolean;
  skipReason?: string;
};

export type OrganizationSyncResult = {
  synced: number;
  skipped: number;
  exceptionsCreated: number;
  results: ShipmentSyncResult[];
  syncedAt: string;
};

export type CarrierExceptionResult = {
  exceptionCreated: boolean;
  exceptionTitle?: string;
  exceptionId?: string;
};

function resolveTrackingNumber(input: ShipmentSyncInput): string | null {
  if (input.trackingNumber) return input.trackingNumber;
  const key = resolveCarrierKey(input.carrier);
  if (!key) return null;
  return generateTrackingNumber(input.shipmentNumber, key);
}

function hasActiveCarrierException(
  exceptions: ExceptionRecord[],
  shipmentId: string,
): ExceptionRecord | undefined {
  return exceptions.find(
    (e) =>
      e.shipmentId === shipmentId &&
      e.status !== "Resolved" &&
      e.source === "Carrier Sync",
  );
}

export async function createExceptionsFromCarrierEvents(
  input: ShipmentSyncInput,
  carrierStatus: CarrierStatus,
  events: CarrierShipmentEvent[],
  previousCarrierStatus: CarrierStatus | null,
  organizationId?: string,
  existingCarrierException?: ExceptionRecord,
): Promise<CarrierExceptionResult> {
  if (carrierStatus !== "Exception") {
    return { exceptionCreated: false };
  }

  if (previousCarrierStatus === "Exception" || existingCarrierException) {
    return { exceptionCreated: false };
  }

  const latestEvent = events.find((e) => e.status === "Exception") ?? events[0];
  const description =
    latestEvent?.description ?? "Carrier reported exception on shipment";
  const title = `Carrier exception — ${description}`;
  const delayReason = description;

  if (organizationId && isSupabaseConfigured() && input.shipmentUuid) {
    const exceptionId = await createCarrierSyncExceptionInSupabase(
      {
        shipmentUuid: input.shipmentUuid,
        shipmentNumber: input.shipmentNumber,
        title,
        severity: "High",
        delayReason,
      },
      organizationId,
    );
    return { exceptionCreated: true, exceptionTitle: title, exceptionId };
  }

  return { exceptionCreated: true, exceptionTitle: title };
}

export async function syncShipment(
  input: ShipmentSyncInput,
  organizationId?: string,
  existingCarrierException?: ExceptionRecord,
): Promise<ShipmentSyncResult> {
  console.info("[CarrierSync] syncShipment START", {
    shipmentNumber: input.shipmentNumber,
    carrier: input.carrier,
    resolvedCarrierKey: resolveCarrierKey(input.carrier),
    organizationId: organizationId ?? null,
    currentCarrierStatus: input.currentCarrierStatus ?? null,
  });

  const provider = getCarrierProviderForName(input.carrier);
  const trackingNumber = resolveTrackingNumber(input);

  if (!provider || !trackingNumber) {
    console.warn("[CarrierSync] syncShipment SKIPPED", {
      shipmentNumber: input.shipmentNumber,
      carrier: input.carrier,
      resolvedCarrierKey: resolveCarrierKey(input.carrier),
      skipReason: !provider ? "No carrier provider configured" : "Missing tracking number",
    });
    return {
      shipmentNumber: input.shipmentNumber,
      carrier: input.carrier,
      trackingNumber: trackingNumber ?? "",
      previousCarrierStatus: input.currentCarrierStatus ?? null,
      carrierStatus: input.currentCarrierStatus ?? "In Transit",
      shipmentStatus: input.currentStatus,
      estimatedDelivery: null,
      actualDelivery: null,
      lastCarrierUpdate: new Date().toISOString(),
      statusChanged: false,
      exceptionCreated: false,
      events: [],
      skipped: true,
      skipReason: !provider ? "No carrier provider configured" : "Missing tracking number",
    };
  }

  const snapshot = await getTrackingSnapshot(provider, trackingNumber);
  const shipmentStatus = mapCarrierStatusToShipmentStatus(snapshot.status);
  const previousCarrierStatus = input.currentCarrierStatus ?? null;
  const statusChanged =
    previousCarrierStatus !== snapshot.status ||
    input.currentStatus !== shipmentStatus;

  let shipmentUuid = input.shipmentUuid;
  if (!shipmentUuid && organizationId && isSupabaseConfigured()) {
    shipmentUuid = (await lookupShipmentUuid(input.shipmentNumber, organizationId)) ?? undefined;
    console.info("[CarrierSync] lookupShipmentUuid", {
      shipmentNumber: input.shipmentNumber,
      organizationId,
      shipmentUuid: shipmentUuid ?? null,
    });
  }

  const exceptionResult = await createExceptionsFromCarrierEvents(
    { ...input, shipmentUuid },
    snapshot.status,
    snapshot.events,
    previousCarrierStatus,
    organizationId,
    existingCarrierException,
  ).catch((err) => {
    console.error("[CarrierSync] createExceptionsFromCarrierEvents FAILED (continuing shipment update)", {
      shipmentNumber: input.shipmentNumber,
      organizationId: organizationId ?? null,
      error: err instanceof Error ? err.message : err,
    });
    return { exceptionCreated: false } as CarrierExceptionResult;
  });

  if (organizationId && isSupabaseConfigured()) {
    if (!shipmentUuid) {
      console.warn("[CarrierSync] skipping Supabase update — shipment UUID not found", {
        shipmentNumber: input.shipmentNumber,
        organizationId,
      });
    } else {
      await updateShipmentCarrierFields(shipmentUuid, organizationId, {
        tracking_number: trackingNumber,
        carrier_status: snapshot.status,
        last_carrier_update: snapshot.lastUpdate,
        estimated_delivery: snapshot.estimatedDelivery,
        actual_delivery: snapshot.actualDelivery,
        status: shipmentStatus,
      });
    }
  }

  return {
    shipmentNumber: input.shipmentNumber,
    carrier: input.carrier,
    trackingNumber,
    previousCarrierStatus,
    carrierStatus: snapshot.status,
    shipmentStatus,
    estimatedDelivery: snapshot.estimatedDelivery,
    actualDelivery: snapshot.actualDelivery,
    lastCarrierUpdate: snapshot.lastUpdate,
    statusChanged,
    exceptionCreated: exceptionResult.exceptionCreated,
    exceptionTitle: exceptionResult.exceptionTitle,
    events: snapshot.events,
    skipped: false,
  };
}

export async function syncOrganizationShipments(
  shipments: Shipment[],
  organizationId?: string,
  exceptions: ExceptionRecord[] = [],
  carrierFilter?: CarrierKey,
): Promise<OrganizationSyncResult> {
  console.info("[CarrierSync] syncOrganizationShipments START", {
    carrierKey: carrierFilter ?? "all",
    organizationId: organizationId ?? null,
    isSupabaseConfigured: isSupabaseConfigured(),
    totalShipments: shipments.length,
  });

  const active = shipments.filter((s) => {
    if (s.status === "Delivered") return false;
    const key = resolveCarrierKey(s.carrier);
    if (!key) return false;
    if (carrierFilter && key !== carrierFilter) return false;
    return true;
  });

  console.info("[CarrierSync] syncOrganizationShipments shipments matched", {
    carrierKey: carrierFilter ?? "all",
    organizationId: organizationId ?? null,
    activeCount: active.length,
    activeShipments: active.map((s) => ({
      id: s.id,
      carrier: s.carrier,
      resolvedKey: resolveCarrierKey(s.carrier),
      status: s.status,
    })),
    unmatchedCarriers: [
      ...new Set(
        shipments
          .filter((s) => s.status !== "Delivered" && !resolveCarrierKey(s.carrier))
          .map((s) => s.carrier),
      ),
    ],
  });

  const results: ShipmentSyncResult[] = [];

  for (const shipment of active) {
    const existingCarrierException = hasActiveCarrierException(exceptions, shipment.id);

    const result = await syncShipment(
      {
        shipmentNumber: shipment.id,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        currentStatus: shipment.status,
        currentCarrierStatus: shipment.carrierStatus,
      },
      organizationId,
      existingCarrierException,
    );
    results.push(result);
  }

  return {
    synced: results.filter((r) => !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    exceptionsCreated: results.filter((r) => r.exceptionCreated).length,
    results,
    syncedAt: new Date().toISOString(),
  };
}

async function updateShipmentCarrierFields(
  shipmentUuid: string,
  organizationId: string,
  fields: {
    tracking_number: string;
    carrier_status: string;
    last_carrier_update: string;
    estimated_delivery: string | null;
    actual_delivery: string | null;
    status: ShipmentStatus;
  },
): Promise<void> {
  const supabase = getSupabaseClient();

  console.info("[CarrierSync] Supabase update BEFORE public.shipments", {
    shipmentUuid,
    organizationId,
    fields,
  });

  const { data, error } = await supabase
    .from("shipments")
    .update({
      tracking_number: fields.tracking_number,
      carrier_status: fields.carrier_status,
      last_carrier_update: fields.last_carrier_update,
      estimated_delivery: fields.estimated_delivery,
      actual_delivery: fields.actual_delivery,
      status: fields.status,
    })
    .eq("id", shipmentUuid)
    .eq("organization_id", organizationId)
    .select(
      "id, shipment_number, tracking_number, carrier_status, last_carrier_update, estimated_delivery, actual_delivery, status",
    );

  if (error) {
    console.error("[CarrierSync] Supabase update FAILED public.shipments", {
      shipmentUuid,
      organizationId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  console.info("[CarrierSync] Supabase update AFTER public.shipments", {
    shipmentUuid,
    organizationId,
    rowsUpdated: data?.length ?? 0,
    updatedRows: data,
  });

  if (!data || data.length === 0) {
    console.warn("[CarrierSync] Supabase update matched 0 rows", {
      shipmentUuid,
      organizationId,
      hint: "Check shipment UUID and organization_id alignment with RLS",
    });
  }
}

async function lookupShipmentUuid(
  shipmentNumber: string,
  organizationId: string,
): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("shipments")
    .select("id")
    .eq("shipment_number", shipmentNumber)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[CarrierSync] lookupShipmentUuid FAILED", {
      shipmentNumber,
      organizationId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throwReadableError(error);
  }

  return data?.id ?? null;
}

export function buildMockExceptionFromSync(
  result: ShipmentSyncResult,
  shipment: Shipment,
  existingExceptions: ExceptionRecord[],
): ExceptionRecord | null {
  if (!result.exceptionCreated || !result.exceptionTitle) return null;

  if (hasActiveCarrierException(existingExceptions, shipment.id)) return null;

  const delayReason = result.events[0]?.description ?? "Carrier reported exception";
  const playbook = assignPlaybook({
    title: result.exceptionTitle,
    delayReason,
    severity: "High",
    source: "Carrier Sync",
  });

  const idNum = 4400 + existingExceptions.length + 1;
  return {
    id: `EXC-${idNum}`,
    shipmentId: shipment.id,
    title: result.exceptionTitle,
    customer: shipment.customer,
    carrier: shipment.carrier,
    route: `${shipment.origin} → ${shipment.destination}`,
    severity: "High",
    status: "Open",
    owner: playbook.owner,
    delayReason,
    openedAt: new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).replace(",", " ·"),
    updatedAt: "Just now",
    source: "Carrier Sync",
    playbookType: playbook.playbookType,
    escalationLevel: playbook.escalationLevel,
    recommendedAction: playbook.recommendedAction,
    nextFollowUpAt: playbook.nextFollowUpAt,
    internalNotes: [],
  };
}

export function applySyncResultToShipment(
  shipment: Shipment,
  result: ShipmentSyncResult,
): Shipment {
  if (result.skipped) return shipment;

  return {
    ...shipment,
    trackingNumber: result.trackingNumber,
    carrierStatus: result.carrierStatus,
    lastCarrierUpdate: result.lastCarrierUpdate,
    estimatedDelivery: result.estimatedDelivery
      ? formatDisplayDate(result.estimatedDelivery)
      : null,
    actualDelivery: result.actualDelivery
      ? formatDisplayDate(result.actualDelivery)
      : null,
    status: result.shipmentStatus,
  };
}

export const SIMULATED_CARRIER_EXCEPTION_TITLE = "Carrier Exception Detected";
export const SIMULATED_CARRIER_EXCEPTION_DELAY_REASON =
  "Carrier reported exception during sync";

export type SimulateCarrierExceptionResult = {
  carrierKey: CarrierKey;
  shipmentId: string;
  shipmentUpdated: boolean;
  exceptionCreated: boolean;
  skippedReason?: string;
};

export function findMonitoredShipmentForCarrier(
  shipments: Shipment[],
  carrierKey: CarrierKey,
): Shipment | undefined {
  return shipments.find((s) => {
    if (s.status === "Delivered") return false;
    return resolveCarrierKey(s.carrier) === carrierKey;
  });
}

export function applySimulatedExceptionToShipment(
  shipment: Shipment,
  lastCarrierUpdate: string,
): Shipment {
  return {
    ...shipment,
    carrierStatus: "Exception",
    lastCarrierUpdate: formatDisplayDate(lastCarrierUpdate),
    status: "Exception",
    issueStatus: "Open",
    exception: SIMULATED_CARRIER_EXCEPTION_TITLE,
    delayReason: SIMULATED_CARRIER_EXCEPTION_DELAY_REASON,
    severity: "High",
  };
}

export function buildMockSimulatedException(
  shipment: Shipment,
  existingExceptions: ExceptionRecord[],
): ExceptionRecord | null {
  if (hasActiveCarrierException(existingExceptions, shipment.id)) return null;

  const playbook = assignPlaybook({
    title: SIMULATED_CARRIER_EXCEPTION_TITLE,
    delayReason: SIMULATED_CARRIER_EXCEPTION_DELAY_REASON,
    severity: "High",
    source: "Carrier Sync",
  });

  const idNum = 4400 + existingExceptions.length + 1;
  return {
    id: `EXC-${idNum}`,
    shipmentId: shipment.id,
    title: SIMULATED_CARRIER_EXCEPTION_TITLE,
    customer: shipment.customer,
    carrier: shipment.carrier,
    route: `${shipment.origin} → ${shipment.destination}`,
    severity: "High",
    status: "Open",
    owner: playbook.owner,
    delayReason: SIMULATED_CARRIER_EXCEPTION_DELAY_REASON,
    openedAt: new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).replace(",", " ·"),
    updatedAt: "Just now",
    source: "Carrier Sync",
    playbookType: playbook.playbookType,
    escalationLevel: playbook.escalationLevel,
    recommendedAction: playbook.recommendedAction,
    nextFollowUpAt: playbook.nextFollowUpAt,
    internalNotes: [],
  };
}

async function updateSimulatedShipmentCarrierException(
  shipmentUuid: string,
  organizationId: string,
  lastCarrierUpdate: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("shipments")
    .update({
      carrier_status: "Exception",
      last_carrier_update: lastCarrierUpdate,
      status: "Exception",
    })
    .eq("id", shipmentUuid)
    .eq("organization_id", organizationId)
    .select("id, shipment_number, carrier_status, last_carrier_update, status");

  if (error) {
    throwReadableError(error);
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Simulated exception update matched 0 shipment rows (uuid=${shipmentUuid}).`,
    );
  }
}

export async function simulateCarrierException(
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  carrierKey: CarrierKey,
  organizationId?: string,
): Promise<SimulateCarrierExceptionResult> {
  try {
    const shipment = findMonitoredShipmentForCarrier(shipments, carrierKey);
    if (!shipment) {
      return {
        carrierKey,
        shipmentId: "",
        shipmentUpdated: false,
        exceptionCreated: false,
        skippedReason: "No monitored shipment for carrier",
      };
    }

    const existingCarrierException = hasActiveCarrierException(exceptions, shipment.id);
    const lastCarrierUpdate = new Date().toISOString();

    if (organizationId && isSupabaseConfigured()) {
      const shipmentUuid = await lookupShipmentUuid(shipment.id, organizationId);
      if (!shipmentUuid) {
        throw new Error(`Shipment ${shipment.id} not found in organization.`);
      }

      await updateSimulatedShipmentCarrierException(
        shipmentUuid,
        organizationId,
        lastCarrierUpdate,
      );

      let exceptionCreated = false;
      if (!existingCarrierException) {
        await createCarrierSyncExceptionInSupabase(
          {
            shipmentUuid,
            shipmentNumber: shipment.id,
            title: SIMULATED_CARRIER_EXCEPTION_TITLE,
            severity: "High",
            delayReason: SIMULATED_CARRIER_EXCEPTION_DELAY_REASON,
          },
          organizationId,
        );
        exceptionCreated = true;
      }

      return {
        carrierKey,
        shipmentId: shipment.id,
        shipmentUpdated: true,
        exceptionCreated,
      };
    }

    return {
      carrierKey,
      shipmentId: shipment.id,
      shipmentUpdated: true,
      exceptionCreated: !existingCarrierException,
    };
  } catch (error) {
    logSimulateExceptionError("simulateCarrierException", error);
    throw error instanceof Error ? error : new Error(formatUnknownError(error));
  }
}
