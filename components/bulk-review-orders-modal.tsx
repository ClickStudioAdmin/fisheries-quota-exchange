"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { tableSecondaryButtonClassName } from "@/components/auth-card";

export function BulkReviewOrdersModal({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const close = useCallback(() => {
    router.push("/admin/orders");
  }, [router]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-16"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-review-orders-title"
        className="mb-16 w-full min-w-0 max-w-7xl border border-line bg-paper p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="bulk-review-orders-title"
              className="text-xl font-semibold text-ink"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {count === 1
                ? "1 order in this queue."
                : `${count} orders in this queue. Work down the list.`}
            </p>
          </div>
          <button
            type="button"
            className={tableSecondaryButtonClassName}
            onClick={close}
          >
            Close
          </button>
        </div>
        <div className="mt-6 divide-y divide-line">{children}</div>
      </div>
    </div>
  );
}
