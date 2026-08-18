"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { tableSecondaryButtonClassName } from "@/components/auth-card";

export function BulkReviewHoldingsModal({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const close = useCallback(() => {
    router.push("/admin/holdings");
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
        aria-labelledby="bulk-review-holdings-title"
        className="mb-16 w-full max-w-2xl border border-line bg-paper-raised p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="bulk-review-holdings-title"
              className="text-xl font-semibold text-ink"
            >
              Verify holdings
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {count === 1
                ? "1 holding waiting for verification."
                : `${count} holdings waiting for verification. Work down the list.`}
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
