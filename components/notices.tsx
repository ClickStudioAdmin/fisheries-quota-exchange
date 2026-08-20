import type { ReactNode } from "react";
import Link from "next/link";

export function SuccessNotice({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-3 border border-sea bg-sea/10 px-4 py-3 ${className ?? "mt-4"}`}
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
