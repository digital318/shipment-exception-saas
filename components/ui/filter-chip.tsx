"use client";

export function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 active:scale-[0.97] ${
        active
          ? "border-violet-500/30 bg-violet-500/10 text-violet-200 shadow-sm shadow-violet-500/10 ring-1 ring-violet-500/20"
          : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-zinc-200"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
            active ? "bg-violet-500/20 text-violet-300" : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
