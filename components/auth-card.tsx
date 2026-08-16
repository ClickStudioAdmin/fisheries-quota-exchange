import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  children: ReactNode;
};

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export const fieldClassName =
  "mt-1 w-full border border-line bg-paper-raised px-3 py-2 text-ink outline-none focus:border-sea";

export const buttonClassName =
  "bg-sea px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60";
