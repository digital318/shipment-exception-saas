export type ShipmentStatus = "In Transit" | "Delayed" | "Delivered" | "Exception";
export type Severity = "Critical" | "High" | "Medium" | "Low";
export type IssueStatus =
  | "Open"
  | "Investigating"
  | "Escalated"
  | "Pending Customer"
  | "Awaiting Carrier"
  | "Resolved";

export type Shipment = {
  id: string;
  customer: string;
  carrier: string;
  mode: string;
  origin: string;
  destination: string;
  eta: string;
  originalEta: string;
  delayHours: number | null;
  delayReason: string;
  severity: Severity;
  status: ShipmentStatus;
  issueStatus: IssueStatus;
  exception: string;
};

export type InternalNote = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type ExceptionRecord = {
  /** Display id shown in UI (e.g. EXC-4387). */
  id: string;
  /** Supabase uuid; present when loaded from or persisted to the database. */
  dbId?: string;
  shipmentId: string;
  title: string;
  customer: string;
  carrier: string;
  route: string;
  severity: Severity;
  status: IssueStatus;
  owner: string;
  delayReason: string;
  openedAt: string;
  updatedAt: string;
  resolvedAt?: string;
  internalNotes: InternalNote[];
};

export type CreateExceptionInput = {
  shipmentId: string;
  title: string;
  severity: Severity;
  delayReason: string;
  owner: string;
  status?: IssueStatus;
};

export type UpdateExceptionInput = Partial<
  Pick<ExceptionRecord, "title" | "severity" | "status" | "owner" | "delayReason">
>;

export type Customer = {
  /** Display id (e.g. CUS-001) or short uuid prefix. */
  id: string;
  /** Supabase uuid when loaded from database. */
  dbId?: string;
  name: string;
  contactName: string;
  contactEmail: string;
  tier: "Enterprise" | "Growth" | "Standard";
  /** @deprecated Use contactName — kept for existing references. */
  accountManager: string;
  activeShipments: number;
  exceptions: number;
  /** Agreed SLA target percent (from customers.sla_target_percent). */
  slaTarget: number;
  region: string;
};

export type CarrierPerformance = {
  carrier: string;
  onTimePct: number;
  activeLoads: number;
  exceptions: number;
  avgDelayHours: number;
  trend: "up" | "down" | "flat";
};

export type DelayReasonSummary = {
  reason: string;
  count: number;
  pct: number;
};

export type WeeklyTrendPoint = {
  day: string;
  exceptions: number;
};

export type ActivityType = "escalation" | "action" | "update" | "resolved" | "alert";

export type ActivityItem = {
  time: string;
  actor: string;
  event: string;
  shipmentId: string | null;
  type: ActivityType;
};

export type NotificationType =
  | "exception_critical"
  | "exception_high"
  | "sla_risk"
  | "resolution";

export type NotificationStatus = "Unread" | "Read";

export type NotificationRecord = {
  id: string;
  organizationId: string;
  exceptionId?: string;
  customerId?: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: Severity;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
  /** Enriched display fields */
  exceptionDisplayId?: string;
  customerName?: string;
  shipmentId?: string;
};

export type CreateNotificationInput = {
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: Severity;
  exceptionId?: string;
  customerId?: string;
};
