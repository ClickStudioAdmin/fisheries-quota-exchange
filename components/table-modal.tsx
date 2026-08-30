"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  tableButtonClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";

type StoredModal = { open: boolean; held: boolean };

const storedModals = new Map<string, StoredModal>();

type TableModalProps = {
  title: string;
  label?: string;
  wide?: boolean;
  persistKey?: string;
  triggerClassName?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
};

export function TableModal({
  title,
  label = "Edit",
  wide = false,
  persistKey,
  triggerClassName = tableButtonClassName,
  children,
}: TableModalProps) {
  const stored = persistKey ? storedModals.get(persistKey) : undefined;
  const [open, setOpen] = useState(() => stored?.open ?? false);
  const [held, setHeld] = useState(() => stored?.held ?? stored?.open ?? false);
  const titleId = useId();

  const persist = useCallback(
    (nextOpen: boolean, nextHeld: boolean) => {
      if (persistKey) {
        storedModals.set(persistKey, { open: nextOpen, held: nextHeld });
      }
    },
    [persistKey],
  );

  const close = useCallback(() => {
    setOpen(false);
    persist(false, true);
  }, [persist]);

  const show = useCallback(() => {
    setHeld(true);
    setOpen(true);
    persist(true, true);
  }, [persist]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const overlay = held ? (
    <div
      className={
        open
          ? "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-16 whitespace-normal"
          : "hidden"
      }
      onClick={close}
      inert={!open}
      aria-hidden={!open}
    >
      <div
        role="dialog"
        aria-modal={open}
        aria-labelledby={titleId}
        className={`mb-16 w-full min-w-0 overflow-x-hidden border border-line p-6 whitespace-normal ${
          wide ? "max-w-7xl bg-paper" : "max-w-md bg-paper-raised"
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
  ) : null;

  return (
    <>
      <button type="button" className={triggerClassName} onClick={show}>
        {label}
      </button>
      {overlay && typeof document !== "undefined"
        ? createPortal(overlay, document.body)
        : overlay}
    </>
  );
}
