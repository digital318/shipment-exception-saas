import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DASHBOARD_HOME,
  isAuthRoute,
  isOnboardingRoute,
  isPublicPath,
} from "@/lib/auth/routes";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = DASHBOARD_HOME;
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const needsOnboarding = !profile?.organization_id;

    if (needsOnboarding) {
      if (!isOnboardingRoute(pathname)) {
        const onboardingUrl = request.nextUrl.clone();
        onboardingUrl.pathname = "/onboarding";
        onboardingUrl.search = "";
        return NextResponse.redirect(onboardingUrl);
      }
    } else if (isOnboardingRoute(pathname)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = DASHBOARD_HOME;
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
  }

  return supabaseResponse;
}
