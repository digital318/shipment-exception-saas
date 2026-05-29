export const AUTH_ROUTES = ["/login", "/signup"] as const;

export const PUBLIC_PATH_PREFIXES = ["/login", "/signup", "/api"] as const;

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
