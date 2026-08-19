import type { ReactNode } from "react";
import Link from "next/link";

export const panelClassName = "border border-line bg-paper-raised p-5";

export const pageWidthClassName =
  "mx-auto w-full max-w-[min(100rem,96vw)] px-4 sm:px-6 lg:px-8";

export const cardClassName =
  `${panelClassName} transition-colors hover:border-sea`;

export const statClassName = "border border-line bg-paper-raised p-4";

export function SuccessNotice({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className="mt-4 flex gap-3 border border-sea bg-sea/10 px-4 py-3"
      role="status"
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sea text-xs font-semibold text-paper"
        aria-hidden
      >
        ✓
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-sm font-semibold text-sea">{title}</p>
          {action}
        </div>
        {children ? <p className="mt-1 text-sm text-ink">{children}</p> : null}
      </div>
    </div>
  );
}

export function ActionNotice({
  title,
  href,
  actionLabel,
  action,
  icon,
  children,
}: {
  title: string;
  href?: string;
  actionLabel?: string;
  action?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const cta =
    action ??
    (href && actionLabel ? (
      <Link
        href={href}
        className="shrink-0 bg-sea px-4 py-2 text-center text-sm font-medium text-paper hover:opacity-90"
      >
        {actionLabel}
      </Link>
    ) : null);

  return (
    <div
      className="flex flex-col gap-4 border border-sea bg-sea/10 p-4 sm:flex-row sm:items-start sm:justify-between"
      role="status"
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          {children ? (
            <div className="mt-1 text-sm text-ink">{children}</div>
          ) : null}
        </div>
      </div>
      {cta}
    </div>
  );
}

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
    <dl className={`grid gap-x-6 gap-y-3 ${columnClassName}`}>
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
