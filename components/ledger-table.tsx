"use client";

import { DataTable, formatTableDateTime } from "@/components/data-table";
import type { QuotaLedgerEntry } from "@/lib/fisheries/types";

export function LedgerTable({
  entries,
  caption,
}: {
  entries: QuotaLedgerEntry[];
  caption: string;
}) {
  return (
    <DataTable
      caption={caption}
      empty="No ledger rows."
      searchPlaceholder="Filter ledger…"
      defaultSort={{ key: "created", direction: "asc" }}
      columns={[
        { key: "created", header: "When", sortable: true },
        { key: "event", header: "Event", sortable: true, filter: "select" },
        { key: "delta", header: "Delta", sortable: true, align: "right" },
        { key: "after", header: "After", sortable: true, align: "right" },
        { key: "note", header: "Note", sortable: true },
      ]}
      rows={entries.map((entry) => ({
        id: entry.id,
        values: {
          created: entry.created_at,
          event: entry.event_type,
          delta: entry.quantity_delta,
          after: entry.quantity_after,
          note: entry.note ?? "",
        },
        display: {
          created: formatTableDateTime(entry.created_at),
          note: entry.note ?? "—",
        },
      }))}
    />
  );
}
