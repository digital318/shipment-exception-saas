export type DbOrganization = {
  id: string;
  name: string;
  slug?: string;
  operations_email?: string | null;
  ops_email?: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type DbUserProfile = {
  user_id: string;
  organization_id: string | null;
  email: string;
  display_name: string | null;
  role: "owner" | "admin" | "member";
  created_at: string;
  updated_at: string;
};

export type DbCustomer = {
  id: string;
  organization_id: string | null;
  name: string;
  contact_name: string;
  contact_email: string;
  sla_target_percent: number;
  created_at: string;
};

export type DbShipment = {
  id: string;
  organization_id: string | null;
  shipment_number: string;
  customer_id: string;
  carrier: string;
  origin: string;
  destination: string;
  eta: string;
  status: string;
  delay_hours: number | null;
  tracking_number: string | null;
  carrier_status: string | null;
  last_carrier_update: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  created_at: string;
  updated_at: string;
};

export type DbException = {
  id: string;
  organization_id: string | null;
  shipment_id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  owner: string;
  delay_reason: string | null;
  resolution_summary: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbExceptionNote = {
  id: string;
  organization_id: string | null;
  exception_id: string;
  author: string;
  note: string;
  created_at: string;
};

export type DbActivityEvent = {
  id: string;
  organization_id: string | null;
  exception_id: string;
  event_type: string;
  message: string;
  created_at: string;
};

export type DbShipmentWithCustomer = DbShipment & {
  customer: Pick<DbCustomer, "id" | "name" | "contact_name" | "sla_target_percent"> | null;
};

export type DbExceptionWithRelations = DbException & {
  shipment: (DbShipment & { customer: Pick<DbCustomer, "name"> | null }) | null;
  exception_notes: DbExceptionNote[];
};

export type DbActivityEventWithRelations = DbActivityEvent & {
  exception: {
    owner: string;
    shipment: Pick<DbShipment, "shipment_number"> | null;
  } | null;
};

export type DbNotification = {
  id: string;
  organization_id: string;
  exception_id: string | null;
  customer_id: string | null;
  type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  created_at: string;
  read_at: string | null;
};

export type DbNotificationWithRelations = DbNotification & {
  exception: {
    id: string;
    title: string;
    shipment: Pick<DbShipment, "shipment_number"> | null;
  } | null;
  customer: Pick<DbCustomer, "id" | "name"> | null;
};
