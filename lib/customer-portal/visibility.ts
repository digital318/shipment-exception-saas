import type {
  ActivityItem,
  ActivityType,
  ExceptionRecord,
  IssueStatus,
  Shipment,
  ShipmentStatus,
} from "@/lib/types";

/** Internal activity types never shown in the customer portal. */
const INTERNAL_ACTIVITY_TYPES: ActivityType[] = [
  "escalation",
  "overdue_follow_up",
  "customer_risk",
  "sla_breach",
  "customer_notification_created",
  "customer_notification_read",
];

const INTERNAL_ACTIVITY_KEYWORDS = [
  "escalat",
  "playbook",
  "assigned owner",
  "owner assigned",
  "follow-up",
  "follow up",
  "internal note",
  "auto-escalat",
  "network alert",
];

export type CustomerSafeException = {
  id: string;
  shipmentId: string;
  title: string;
  severity: ExceptionRecord["severity"];
  status: IssueStatus;
  owner: string;
  updatedAt: string;
  delayReason: string;
  carrier: string;
  route: string;
};

export function filterShipmentsByCustomer(
  shipments: Shipment[],
  customerName: string,
): Shipment[] {
  return shipments.filter((s) => s.customer === customerName);
}

export function filterExceptionsByCustomer(
  exceptions: ExceptionRecord[],
  customerName: string,
): ExceptionRecord[] {
  return exceptions.filter((e) => e.customer === customerName);
}

export function filterOpenExceptions(exceptions: ExceptionRecord[]): ExceptionRecord[] {
  return exceptions.filter((e) => e.status !== "Resolved");
}

/** Map internal statuses to customer-safe labels without exposing escalation workflow. */
export function toCustomerSafeStatus(status: IssueStatus): IssueStatus {
  if (status === "Escalated") return "Investigating";
  return status;
}

export function toCustomerSafeException(exc: ExceptionRecord): CustomerSafeException {
  return {
    id: exc.id,
    shipmentId: exc.shipmentId,
    title: exc.title,
    severity: exc.severity,
    status: toCustomerSafeStatus(exc.status),
    owner: exc.owner,
    updatedAt: exc.updatedAt,
    delayReason: exc.delayReason,
    carrier: exc.carrier,
    route: exc.route,
  };
}

export function toCustomerSafeExceptions(
  exceptions: ExceptionRecord[],
): CustomerSafeException[] {
  return exceptions.map(toCustomerSafeException);
}

function isInternalActivityEvent(event: string): boolean {
  const lower = event.toLowerCase();
  return INTERNAL_ACTIVITY_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function isCustomerSafeActivity(item: ActivityItem): boolean {
  if (INTERNAL_ACTIVITY_TYPES.includes(item.type)) return false;
  if (item.type === "alert") return false;
  if (isInternalActivityEvent(item.event)) return false;
  return item.type === "update" || item.type === "resolved" || item.type === "action";
}

export function filterCustomerSafeActivity(
  activity: ActivityItem[],
  shipmentIds: Set<string>,
): ActivityItem[] {
  return activity.filter(
    (item) =>
      isCustomerSafeActivity(item) &&
      (item.shipmentId == null || shipmentIds.has(item.shipmentId)),
  );
}

export function filterShipmentsByStatus(
  shipments: Shipment[],
  status: ShipmentStatus | "all",
): Shipment[] {
  if (status === "all") return shipments;
  return shipments.filter((s) => s.status === status);
}
