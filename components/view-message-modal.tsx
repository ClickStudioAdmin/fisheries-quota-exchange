"use client";

import { TableModal } from "@/components/table-modal";

export function ViewMessageModal({
  title = "Message",
  label = "View Message",
  message,
}: {
  title?: string;
  label?: string;
  message: string;
}) {
  return (
    <TableModal
      title={title}
      label={label}
      triggerClassName="whitespace-nowrap text-sm underline"
    >
      <p className="whitespace-pre-wrap text-sm text-ink">{message}</p>
    </TableModal>
  );
}
