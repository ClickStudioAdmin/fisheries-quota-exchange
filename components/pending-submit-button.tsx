"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function PendingSubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled) || pending;
  const label =
    pendingLabel ??
    (typeof children === "string" ? `${children}…` : "Working…");

  return (
    <button
      type="submit"
      className={className}
      disabled={isDisabled}
      aria-busy={pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          {label}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
