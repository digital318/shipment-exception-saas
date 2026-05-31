import { DEFAULT_AUTO_EXCEPTION_OWNER } from "@/lib/constants";
import {
  generateTrackingNumber,
  getCarrierProviderForName,
  getTrackingSnapshot,
  mapCarrierStatusToShipmentStatus,
  resolveCarrierKey,
} from "@/lib/carriers";
import { formatDisplayDate } from "@/lib/data/format";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  CarrierKey,
  CarrierShipmentEvent,
  CarrierStatus,
  ExceptionRecord,
  Shipment,
  ShipmentStatus,
} from "@/lib/types";
import {
  buildExceptionNotificationInput,
} from "@/lib/data/notification-rules";
import {
  createAutoDetectedExceptionInSupabase,
} from "@/lib/data/mutations";
import { createNotification } from "@/lib/data/notifications";

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

export async function createExceptionsFromCarrierEvents(
  input: ShipmentSyncInput,
  events: CarrierShipmentEvent[],
  previousCarrierStatus: CarrierStatus | null,
  organizationId?: string,
  existingException?: ExceptionRecord,
): Promise<CarrierExceptionResult> {
  const latestEvent = events[0];
  if (!latestEvent || latestEvent.status !== "Exception") {
    return { exceptionCreated: false };
  }

  if (previousCarrierStatus === "Exception" || existingException) {
    return { exceptionCreated: false };
  }

  const title = `Carrier exception — ${latestEvent.description}`;
  const delayReason = latestEvent.description;

  if (organizationId && isSupabaseConfigured() && input.shipmentUuid) {
    const exceptionId = await createAutoDetectedExceptionInSupabase(
      {
        shipmentUuid: input.shipmentUuid,
        shipmentNumber: input.shipmentNumber,
        title,
        severity: "High",
        delayReason,
        owner: DEFAULT_AUTO_EXCEPTION_OWNER,
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
  existingException?: ExceptionRecord,
): Promise<ShipmentSyncResult> {
  const provider = getCarrierProviderForName(input.carrier);
  const trackingNumber = resolveTrackingNumber(input);

  if (!provider || !trackingNumber) {
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
  }

  const exceptionResult = await createExceptionsFromCarrierEvents(
    { ...input, shipmentUuid },
    snapshot.events,
    previousCarrierStatus,
    organizationId,
    existingException,
  );

  if (organizationId && isSupabaseConfigured()) {
    await updateShipmentCarrierFields(
      input.shipmentNumber,
      organizationId,
      {
        tracking_number: trackingNumber,
        carrier_status: snapshot.status,
        last_carrier_update: snapshot.lastUpdate,
        estimated_delivery: snapshot.estimatedDelivery,
        actual_delivery: snapshot.actualDelivery,
        status: shipmentStatus,
      },
    );
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
  const active = shipments.filter((s) => {
    if (s.status === "Delivered") return false;
    const key = resolveCarrierKey(s.carrier);
    if (!key) return false;
    if (carrierFilter && key !== carrierFilter) return false;
    return true;
  });

  const results: ShipmentSyncResult[] = [];

  for (const shipment of active) {
    const existingException = exceptions.find(
      (e) => e.shipmentId === shipment.id && e.status !== "Resolved",
    );

    const result = await syncShipment(
      {
        shipmentNumber: shipment.id,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        currentStatus: shipment.status,
        currentCarrierStatus: shipment.carrierStatus,
      },
      organizationId,
      existingException,
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
  shipmentNumber: string,
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
  const { error } = await supabase
    .from("shipments")
    .update({
      tracking_number: fields.tracking_number,
      carrier_status: fields.carrier_status,
      last_carrier_update: fields.last_carrier_update,
      estimated_delivery: fields.estimated_delivery,
      actual_delivery: fields.actual_delivery,
      status: fields.status,
    })
    .eq("shipment_number", shipmentNumber)
    .eq("organization_id", organizationId);

  if (error) throw error;
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

  if (error) throw error;
  return data?.id ?? null;
}

export function buildMockExceptionFromSync(
  result: ShipmentSyncResult,
  shipment: Shipment,
  existingExceptions: ExceptionRecord[],
): ExceptionRecord | null {
  if (!result.exceptionCreated || !result.exceptionTitle) return null;

  const duplicate = existingExceptions.some(
    (e) => e.shipmentId === shipment.id && e.status !== "Resolved",
  );
  if (duplicate) return null;

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
    owner: DEFAULT_AUTO_EXCEPTION_OWNER,
    delayReason: result.events[0]?.description ?? "Carrier reported exception",
    openedAt: new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).replace(",", " ·"),
    updatedAt: "Just now",
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

export async function notifyCarrierException(
  organizationId: string,
  exceptionId: string,
  shipmentNumber: string,
  title: string,
): Promise<void> {
  const input = buildExceptionNotificationInput(organizationId, {
    exceptionId,
    shipmentNumber,
    title,
    severity: "High",
  });
  if (!input) return;

  try {
    await createNotification(input);
  } catch {
    // Notification failure should not block carrier sync.
  }
}
