import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  AuditEvent,
  Order,
  QuotaReservation,
  SimulatedTransaction,
} from "@/lib/orders/types";
import { parseComplianceChecklist } from "@/lib/orders/checklist";
import { latestComplianceUpdateNotes } from "@/lib/orders/compliance-update";

const orderColumns =
  "id, listing_id, holding_id, seller_organisation_id, buyer_organisation_id, offering, quantity, unused_quantity, used_quantity, unit_price_aud, amount_aud, fee_percent, fee_amount_aud, status, seller_name, buyer_name, fishery_name, quota_type_name, measurement_kind, unit_label, created_by_email, created_at, updated_at, review_note, compliance_checklist";

function mapOrder(row: Record<string, unknown> | null): Order | null {
  if (!row) {
    return null;
  }

  return {
    ...(row as Order),
    compliance_checklist: parseComplianceChecklist(row.compliance_checklist),
  };
}

function mapOrders(data: unknown): Order[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((row) =>
      row && typeof row === "object"
        ? mapOrder(row as Record<string, unknown>)
        : null,
    )
    .filter((row): row is Order => row != null);
}

export async function listMyOrders() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .order("created_at", { ascending: false });

  return mapOrders(data);
}

export async function listOrganisationOrders(organisationId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .or(
      `buyer_organisation_id.eq.${organisationId},seller_organisation_id.eq.${organisationId}`,
    )
    .order("created_at", { ascending: false });

  return mapOrders(data);
}

export async function listAllOrders() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .order("created_at", { ascending: false });

  return mapOrders(data);
}

export async function listAdminQueueOrders() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .in("status", [
      "AWAITING_COMPLIANCE",
      "AWAITING_TRANSFER",
      "AWAITING_SETTLEMENT",
    ])
    .order("id", { ascending: false });

  return mapOrders(data);
}

export async function listOrdersByCreator(email: string) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .eq("created_by_email", email.trim().toLowerCase())
    .order("created_at", { ascending: false });

  return mapOrders(data);
}

export async function listOrdersByHolding(holdingId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .eq("holding_id", holdingId)
    .order("id", { ascending: false });

  return mapOrders(data);
}

export async function getOrderForListing(listingId: number) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .eq("listing_id", listingId)
    .in("status", [
      "AWAITING_PAYMENT",
      "AWAITING_COMPLIANCE",
      "AWAITING_TRANSFER",
      "AWAITING_SETTLEMENT",
      "COMPLETED",
    ])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return mapOrder((data as Record<string, unknown> | null) ?? null);
}

async function fetchOrder(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  id: number,
) {
  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .eq("id", id)
    .maybeSingle();

  return mapOrder((data as Record<string, unknown> | null) ?? null);
}

export async function getOrder(id: number) {
  const supabase = (await createClient()) ?? createServiceClient();
  if (!supabase) return null;
  return fetchOrder(supabase, id);
}

export async function getOrderForSystem(id: number) {
  const supabase = createServiceClient() ?? (await createClient());
  if (!supabase) return null;
  return fetchOrder(supabase, id);
}

export async function getReservationForOrder(orderId: number) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("quota_reservations")
    .select(
      "id, order_id, listing_id, holding_id, quantity, status, created_at, released_at",
    )
    .eq("order_id", orderId)
    .maybeSingle();

  return (data as QuotaReservation | null) ?? null;
}

export async function getTransactionForOrder(orderId: number) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("transactions")
    .select("id, order_id, status, amount_aud, created_at, completed_at")
    .eq("order_id", orderId)
    .maybeSingle();

  return (data as SimulatedTransaction | null) ?? null;
}

export async function listOrderAuditEvents(orderId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("audit_events")
    .select("id, event_type, entity_type, entity_id, actor_email, payload, created_at, organisation_id, related_organisation_id")
    .eq("entity_type", "order")
    .eq("entity_id", orderId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  return (data ?? []) as AuditEvent[];
}

export async function listLatestComplianceUpdateNotesByOrderIds(orderIds: number[]) {
  const unique = [
    ...new Set(
      orderIds.filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  const notes = new Map<number, { buyer: string | null; seller: string | null }>();

  for (const id of unique) {
    notes.set(id, { buyer: null, seller: null });
  }

  if (unique.length === 0) {
    return notes;
  }

  const supabase = await createClient();
  if (!supabase) {
    return notes;
  }

  const { data } = await supabase
    .from("audit_events")
    .select("id, entity_id, event_type, payload, created_at")
    .eq("entity_type", "order")
    .in("entity_id", unique)
    .in("event_type", [
      "COMPLIANCE_UPDATE_REQUESTED_BUYER",
      "COMPLIANCE_UPDATE_REQUESTED_SELLER",
    ])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  const grouped = new Map<
    number,
    Array<{ event_type: string; payload: Record<string, unknown> }>
  >();

  for (const row of data ?? []) {
    const orderId = Number((row as { entity_id?: unknown }).entity_id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      continue;
    }

    const list = grouped.get(orderId) ?? [];
    list.push({
      event_type: String((row as { event_type?: unknown }).event_type ?? ""),
      payload: ((row as { payload?: unknown }).payload ?? {}) as Record<
        string,
        unknown
      >,
    });
    grouped.set(orderId, list);
  }

  for (const id of unique) {
    notes.set(id, latestComplianceUpdateNotes(grouped.get(id) ?? []));
  }

  return notes;
}
