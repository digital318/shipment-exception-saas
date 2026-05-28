export type DbCustomer = {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  sla_target_percent: number;
  created_at: string;
};

export type DbShipment = {
  id: string;
  shipment_number: string;
  customer_id: string;
  carrier: string;
  origin: string;
  destination: string;
  eta: string;
  status: string;
  delay_hours: number | null;
  created_at: string;
  updated_at: string;
};

export type DbException = {
  id: string;
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
  exception_id: string;
  author: string;
  note: string;
  created_at: string;
};

export type DbActivityEvent = {
  id: string;
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
