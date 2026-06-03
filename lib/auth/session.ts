import { DEFAULT_DEMO_USER_ID, getDemoUserById, type DemoUser } from "@/lib/auth/roles";

const DEMO_USER_STORAGE_KEY = "freightpulse:demo-user-id";

let currentActorName = "Sarah Chen";

/** In-memory actor for activity logs and mutations (synced with demo user switch). */
export function getCurrentActor(): string {
  return currentActorName;
}

export function setCurrentActor(name: string): void {
  currentActorName = name;
}

export function loadDemoUserId(orgId: string): string {
  if (typeof window === "undefined") return DEFAULT_DEMO_USER_ID;
  try {
    const raw = localStorage.getItem(`${DEMO_USER_STORAGE_KEY}:${orgId}`);
    if (!raw) return DEFAULT_DEMO_USER_ID;
    const user = getDemoUserById(raw);
    return user ? raw : DEFAULT_DEMO_USER_ID;
  } catch {
    return DEFAULT_DEMO_USER_ID;
  }
}

export function saveDemoUserId(orgId: string, userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${DEMO_USER_STORAGE_KEY}:${orgId}`, userId);
}

export function applyDemoUser(user: DemoUser): void {
  setCurrentActor(user.name);
  saveDemoUserId("demo", user.id);
}

export function resolveDemoUser(orgId: string, userId?: string): DemoUser {
  const id = userId ?? loadDemoUserId(orgId);
  return getDemoUserById(id) ?? getDemoUserById(DEFAULT_DEMO_USER_ID)!;
}
