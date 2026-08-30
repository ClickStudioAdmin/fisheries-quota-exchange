"use client";

import type { ReactNode } from "react";
import { TableModal } from "@/components/table-modal";

export function FqxMessageCallout({
  label = "Message from FQX",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="border border-sea bg-sea/10 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-ink">
        {children}
      </p>
    </div>
  );
}

export function ViewMessageModal({
  title = "Message",
  label = "View Message",
  quote,
  quoteLabel = "Message from FQX",
  message,
}: {
  title?: string;
  label?: string;
  quote?: string | null;
  quoteLabel?: string;
  message?: string | null;
}) {
  const quoteText = quote?.trim() ?? "";
  const bodyText = message?.trim() ?? "";

  return (
    <TableModal
      title={title}
      label={label}
      triggerClassName="whitespace-nowrap text-sm underline"
    >
      <div className="space-y-4">
        {quoteText ? (
          <FqxMessageCallout label={quoteLabel}>{quoteText}</FqxMessageCallout>
        ) : null}
        {bodyText ? (
          <p
            className={`whitespace-pre-wrap text-sm ${
              quoteText ? "text-ink-muted" : "text-ink"
            }`}
          >
            {bodyText}
          </p>
        ) : null}
      </div>
    </TableModal>
  );
}
