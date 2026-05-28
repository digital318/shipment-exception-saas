import { IconAlertCircle } from "@/components/icons";

export function LoadingState({
  title = "Loading data",
  description = "Fetching the latest records from FreightPulse…",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/80 ring-1 ring-white/[0.06]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-300">{title}</p>
      <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  );
}

export function ErrorState({
  title = "Unable to load data",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/20">
        <IconAlertCircle className="h-5 w-5 text-rose-400" />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-300">{title}</p>
      <p className="mt-1 max-w-[320px] text-xs leading-relaxed text-zinc-500">
        {description}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
