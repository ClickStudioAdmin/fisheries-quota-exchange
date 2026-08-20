"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  tableButtonClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";

type TableModalProps = {
  title: string;
  label?: string;
  wide?: boolean;
  triggerClassName?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
};

export function TableModal({
  title,
  label = "Edit",
  wide = false,
  triggerClassName = tableButtonClassName,
  children,
}: TableModalProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-16"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`mb-16 w-full min-w-0 border border-line p-6 ${
              wide
                ? "max-w-7xl bg-paper"
                : "max-w-md bg-paper-raised"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-xl font-semibold text-ink">
                {title}
              </h2>
              <button
                type="button"
                className={tableSecondaryButtonClassName}
                onClick={close}
              >
                Close
              </button>
            </div>
            <div className="mt-4 min-w-0">
              {typeof children === "function" ? children(close) : children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
