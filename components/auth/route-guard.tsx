"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuthRole } from "@/context/auth-role-context";
import { btnPrimary, cardSurface } from "@/lib/styles";

export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccessPath, defaultPath, role } = useAuthRole();

  const allowed = canAccessPath(pathname);

  useEffect(() => {
    if (!allowed) {
      router.replace(defaultPath);
    }
  }, [allowed, defaultPath, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <article className={`${cardSurface} max-w-md p-8 text-center`}>
          <p className="text-sm font-semibold text-white">Access restricted</p>
          <p className="mt-2 text-sm text-zinc-500">
            Your role ({role}) does not have permission to view this page.
          </p>
          <Link href={defaultPath} className={`${btnPrimary} mt-6 inline-flex`}>
            Go to your home
          </Link>
        </article>
      </div>
    );
  }

  return <>{children}</>;
}
