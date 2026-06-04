import type { DemoRequest, DemoRequestStatus } from "@/lib/marketing/types";

export type DbDemoRequest = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  monthly_volume: string;
  message: string | null;
  status: DemoRequestStatus;
  created_at: string;
  updated_at: string;
};

export function mapDbDemoRequest(row: DbDemoRequest): DemoRequest {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    monthlyVolume: row.monthly_volume,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
