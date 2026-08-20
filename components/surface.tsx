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
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
  }[columns];

  return (
    <dl className={`grid gap-x-6 gap-y-3 ${columnClassName}`}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            {item.label}
          </dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LabeledFieldGroups({
  groups,
  columns = 2,
}: {
  groups: {
    title?: string;
    items: { label: string; value: ReactNode }[];
    columns?: 2 | 3 | 4 | 5;
  }[];
  columns?: 2 | 3 | 4 | 5;
}) {
  return (
    <div className="divide-y divide-line">
      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <div
            key={group.title ?? group.items.map((item) => item.label).join("-")}
            className="py-5 first:pt-0 last:pb-0"
          >
            {group.title ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                {group.title}
              </p>
            ) : null}
            <LabeledFields
              items={group.items}
              columns={group.columns ?? columns}
            />
          </div>
        ))}
    </div>
  );
}
