import { Suspense } from "react";
import { ReportsPage } from "@/components/pages/reports-page";
import { LoadingState } from "@/components/ui/data-state";
import { cardSurface } from "@/lib/styles";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className={`${cardSurface} overflow-hidden`}>
          <LoadingState title="Loading reports" description="Preparing reporting center…" />
        </div>
      }
    >
      <ReportsPage />
    </Suspense>
  );
}
