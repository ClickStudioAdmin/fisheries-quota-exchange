"use client";

import Link from "next/link";
import {
  DataTable,
  DataTableRowExtras,
  tableLinkClassName,
} from "@/components/data-table";
import {
  auditCategoryOptions,
  auditEventCategory,
  auditEventHref,
  auditEventLabel,
  auditEventLinkLabel,
  auditEventSummary,
  type AuditEvent,
  type AuditLogViewer,
} from "@/lib/audit/types";
import { formatTableDateTime } from "@/lib/format";

export function ActivityLog({
  events,
  viewer,
  caption,
  empty,
}: {
  events: AuditEvent[];
  viewer: AuditLogViewer;
  caption: string;
  empty: string;
}) {
  const showBusiness = viewer === "admin";

  return (
    <DataTable
      caption={caption}
      empty={empty}
      searchPlaceholder="Filter activity…"
      defaultSort={{ key: "when", direction: "desc" }}
      columns={[
        { key: "when", header: "When", sortable: true, nowrap: true },
        {
          key: "category",
          header: "Category",
          sortable: true,
          filter: "select",
          filterOptions: auditCategoryOptions(),
        },
        {
          key: "event",
          header: "Event",
          sortable: true,
          filter: "select",
        },
        { key: "who", header: "Who", sortable: true, filter: "select" },
        ...(showBusiness
          ? [
              {
                key: "business",
                header: "Business",
                sortable: true,
                filter: "select" as const,
              },
            ]
          : []),
        { key: "summary", header: "Detail", sortable: true, details: true },
      ]}
      rows={events.map((event) => {
        const eventLabel = auditEventLabel(event.event_type);
        const who = event.actor_email?.trim() || "System";
        const business =
          [event.organisation_name, event.related_organisation_name]
            .filter(Boolean)
            .join(" / ") || "Platform";

        return {
          id: event.id,
          values: {
            when: event.created_at,
            category: auditEventCategory(event.event_type),
            event: eventLabel,
            who,
            business,
            summary: auditEventSummary(event) || "—",
          },
          display: {
            when: formatTableDateTime(event.created_at),
          },
        };
      })}
    >
      {events.map((event) => {
        const href = auditEventHref(event, viewer);
        if (!href) {
          return null;
        }

        return (
          <DataTableRowExtras
            key={event.id}
            id={event.id}
            links={
              <Link href={href} className={tableLinkClassName}>
                {auditEventLinkLabel(event)}
              </Link>
            }
          />
        );
      })}
    </DataTable>
  );
}
