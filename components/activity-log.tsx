"use client";

import Link from "next/link";
import {
  DataTable,
  DataTableRowExtras,
  tableLinkClassName,
} from "@/components/data-table";
import {
  auditCategoryOptions,
  auditActorLabel,
  auditEventCategory,
  auditEventHref,
  auditEventLabel,
  auditEventLinkLabel,
  auditEventSummary,
  type AuditActorContext,
  type AuditEvent,
  type AuditLogViewer,
} from "@/lib/audit/types";
import { formatTableDateTime } from "@/lib/format";

export function ActivityLog({
  events,
  viewer,
  caption,
  empty,
  organisationId,
  organisationName,
  personNames,
}: {
  events: AuditEvent[];
  viewer: AuditLogViewer;
  caption: string;
  empty: string;
  organisationId?: number | null;
  organisationName?: string | null;
  personNames?: Record<string, string>;
}) {
  const showBusiness = viewer === "admin";
  const actorContext: AuditActorContext = {
    viewer,
    organisationId,
    organisationName,
    personNames,
  };

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
        { key: "summary", header: "Detail", sortable: true, details: true },
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
      ]}
      rows={events.map((event) => {
        const eventLabel = auditEventLabel(event.event_type);
        const who = auditActorLabel(event, actorContext);
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
            summary: auditEventSummary(event, actorContext) || "—",
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
