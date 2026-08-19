import { createClient } from "@/lib/supabase/server";
import type { AuditEvent } from "@/lib/audit/types";

const AUDIT_SELECT =
  "id, event_type, entity_type, entity_id, actor_email, payload, created_at, organisation_id, related_organisation_id";

const AUDIT_LIMIT = 2000;

type OrganisationNameRow = {
  id: number;
  legal_name: string;
};

function asAuditEvents(rows: unknown): AuditEvent[] {
  return (rows ?? []) as AuditEvent[];
}

async function withOrganisationNames(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  events: AuditEvent[],
) {
  const ids = [
    ...new Set(
      events.flatMap((event) =>
        [event.organisation_id, event.related_organisation_id].filter(
          (id): id is number => typeof id === "number",
        ),
      ),
    ),
  ];

  if (ids.length === 0) {
    return events;
  }

  const { data } = await supabase
    .from("organisations")
    .select("id, legal_name")
    .in("id", ids);

  const names = new Map(
    ((data ?? []) as OrganisationNameRow[]).map((row) => [row.id, row.legal_name]),
  );

  return events.map((event) => ({
    ...event,
    organisation_name: event.organisation_id
      ? names.get(event.organisation_id) ?? null
      : null,
    related_organisation_name: event.related_organisation_id
      ? names.get(event.related_organisation_id) ?? null
      : null,
  }));
}

export async function listOrganisationAuditEvents(organisationId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("audit_events")
    .select(AUDIT_SELECT)
    .or(
      `organisation_id.eq.${organisationId},related_organisation_id.eq.${organisationId}`,
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(AUDIT_LIMIT);

  return withOrganisationNames(supabase, asAuditEvents(data));
}

export async function listPlatformAuditEvents() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("audit_events")
    .select(AUDIT_SELECT)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(AUDIT_LIMIT);

  return withOrganisationNames(supabase, asAuditEvents(data));
}
