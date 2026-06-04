import type { ReactNode } from "react";

/** Public marketing pages — no dashboard shell or route guard. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}
