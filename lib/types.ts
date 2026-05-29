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
  id: string;
  name: string;
  tier: "Enterprise" | "Growth" | "Standard";
  accountManager: string;
  activeShipments: number;
  exceptions: number;
  slaPerformance: number;
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
