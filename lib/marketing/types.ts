export const DEMO_REQUEST_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Closed",
] as const;

export type DemoRequestStatus = (typeof DEMO_REQUEST_STATUSES)[number];

export type DemoRequest = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  monthlyVolume: string;
  message: string | null;
  status: DemoRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type DemoRequestInput = {
  name: string;
  company: string;
  email: string;
  phone?: string;
  monthlyVolume: string;
  message?: string;
};

export const MONTHLY_VOLUME_OPTIONS = [
  "Under 500",
  "500 – 2,000",
  "2,000 – 10,000",
  "10,000+",
] as const;
