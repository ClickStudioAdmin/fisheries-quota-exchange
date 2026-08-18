import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  children: ReactNode;
  flush?: boolean;
};

export function AuthCard({ title, children, flush = false }: AuthCardProps) {
  const inner = (
    <div className="w-full max-w-md border border-line bg-paper-raised p-8 sm:p-10">
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
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      {inner}
    </div>
  );
}

export const fieldClassName =
  "mt-1 w-full border border-line bg-paper-raised px-3 py-2 text-ink outline-none focus:border-sea";

export const authFieldClassName =
  "mt-1 w-full border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-sea";

export const buttonClassName =
  "bg-sea px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60";

export const authButtonClassName = `${buttonClassName} w-full`;

export const compactFieldClassName =
  "w-36 border border-line bg-paper-raised px-2 py-1.5 text-sm text-ink outline-none focus:border-sea";

export const tableButtonClassName =
  "whitespace-nowrap bg-sea px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60";

export const tableSecondaryButtonClassName =
  "whitespace-nowrap border border-line px-3 py-1.5 text-sm text-ink hover:bg-paper-raised";
