import { IconPackage } from "@/components/icons";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/80 ring-1 ring-white/[0.06]">
        <IconPackage className="h-5 w-5 text-zinc-500" />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-300">{title}</p>
      <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  );
}
