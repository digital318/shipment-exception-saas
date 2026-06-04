export const AUTH_ROUTES = ["/login", "/signup"] as const;

export const ONBOARDING_ROUTE = "/onboarding";

/** Authenticated app home (operations dashboard). */
export const DASHBOARD_HOME = "/dashboard";

export const MARKETING_PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/demo-request-success",
] as const;

export const PUBLIC_PATH_PREFIXES = [
  ...MARKETING_PUBLIC_PATHS,
  "/login",
  "/signup",
  "/api",
] as const;

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE || pathname.startsWith(`${ONBOARDING_ROUTE}/`);
}

export function isMarketingPublicPath(pathname: string): boolean {
  return MARKETING_PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
