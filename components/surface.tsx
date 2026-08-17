import type { ReactNode } from "react";

export const panelClassName = "border border-line bg-paper-raised p-5";

export const pageWidthClassName =
  "mx-auto w-full max-w-[min(100rem,96vw)] px-4 sm:px-6 lg:px-8";

export const cardClassName =
  `${panelClassName} transition-colors hover:border-sea`;

export const statClassName = "border border-line bg-paper-raised p-4";

export function LabeledFields({
  items,
  columns = 2,
}: {
  items: { label: string; value: ReactNode }[];
  columns?: 2 | 3 | 4 | 5;
}) {
  const columnClassName = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
  }[columns];

  return (
    <dl className={`grid gap-x-6 gap-y-2 ${columnClassName}`}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
