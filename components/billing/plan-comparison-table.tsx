import { PLAN_COMPARISON_FEATURES } from "@/lib/billing/plans";
import { cardSurface } from "@/lib/styles";

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="text-emerald-400">✓</span>
    ) : (
      <span className="text-zinc-600">—</span>
    );
  }
  return <span className="text-zinc-300">{value}</span>;
}

export function PlanComparisonTable({ compact }: { compact?: boolean }) {
  return (
    <div className={`${cardSurface} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className={`px-5 py-4 font-medium text-zinc-500 ${compact ? "text-xs" : ""}`}>
                Feature
              </th>
              <th className="px-5 py-4 font-semibold text-zinc-300">Starter</th>
              <th className="px-5 py-4 font-semibold text-violet-300">Professional</th>
              <th className="px-5 py-4 font-semibold text-zinc-300">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON_FEATURES.map((row) => (
              <tr key={row.label} className="border-b border-white/[0.04] last:border-0">
                <td className="px-5 py-3.5 text-zinc-400">{row.label}</td>
                <td className="px-5 py-3.5">
                  <CellValue value={row.starter} />
                </td>
                <td className="px-5 py-3.5 bg-violet-500/[0.03]">
                  <CellValue value={row.professional} />
                </td>
                <td className="px-5 py-3.5">
                  <CellValue value={row.enterprise} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
