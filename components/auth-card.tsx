import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  children: ReactNode;
  flush?: boolean;
};

export function AuthCard({ title, children, flush = false }: AuthCardProps) {
  const inner = (
    <div className="max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      <div className="mt-6">{children}</div>
    </div>
  );

  if (flush) {
    return inner;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">{inner}</div>
  );
}

export const fieldClassName =
  "mt-1 w-full border border-line bg-paper-raised px-3 py-2 text-ink outline-none focus:border-sea";

export const buttonClassName =
  "bg-sea px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60";

export const compactFieldClassName =
  "w-36 border border-line bg-paper-raised px-2 py-1.5 text-sm text-ink outline-none focus:border-sea";

export const tableButtonClassName =
  "bg-sea px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60";

export const tableSecondaryButtonClassName =
  "border border-line px-3 py-1.5 text-sm text-ink hover:bg-paper-raised";
