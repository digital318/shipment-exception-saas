import type { DemoRequest, DemoRequestInput, DemoRequestStatus } from "@/lib/marketing/types";

const STORAGE_KEY = "freightpulse:demo-requests";

function readAll(): DemoRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DemoRequest[];
  } catch {
    return [];
  }
}

function writeAll(requests: DemoRequest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

export function loadLocalDemoRequests(): DemoRequest[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function saveLocalDemoRequest(input: DemoRequestInput): DemoRequest {
  const now = new Date().toISOString();
  const record: DemoRequest = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    company: input.company.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    monthlyVolume: input.monthlyVolume,
    message: input.message?.trim() || null,
    status: "New",
    createdAt: now,
    updatedAt: now,
  };
  writeAll([record, ...readAll()]);
  return record;
}

export function updateLocalDemoRequestStatus(
  id: string,
  status: DemoRequestStatus,
): DemoRequest | null {
  const all = readAll();
  const index = all.findIndex((r) => r.id === id);
  if (index < 0) return null;
  const updated: DemoRequest = {
    ...all[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  writeAll(all);
  return updated;
}
