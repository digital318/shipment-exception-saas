import type { ActivityItem, Customer, ExceptionRecord, Shipment } from "@/lib/types";

export type DataSource = "supabase" | "mock";

export type DataResult<T> = {
  data: T;
  source: DataSource;
  error?: string;
};

export type AppDataSnapshot = {
  shipments: Shipment[];
  customers: Customer[];
  carriers: string[];
  exceptions: ExceptionRecord[];
  activity: ActivityItem[];
  source: DataSource;
  error?: string;
};
