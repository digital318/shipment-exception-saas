import type { ReactNode } from "react";

export function SectionHeading({
  title,
  description,
  meta,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        )}
      </div>
      {meta}
    </div>
  );
}
