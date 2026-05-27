export function SyncStatus({ state }: { state: "live" | "syncing" | "error" }) {
  const config = {
    live: {
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
      label: "Live",
      text: "text-emerald-400/90",
      ring: "ring-emerald-500/20 bg-emerald-500/5",
    },
    syncing: {
      dot: "bg-amber-400 animate-pulse",
      label: "Syncing",
      text: "text-amber-400/90",
      ring: "ring-amber-500/20 bg-amber-500/5",
    },
    error: {
      dot: "bg-rose-400",
      label: "Sync failed",
      text: "text-rose-400/90",
      ring: "ring-rose-500/20 bg-rose-500/5",
    },
  }[state];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${config.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span className={config.text}>{config.label}</span>
    </span>
  );
}
