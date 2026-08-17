import { createClient } from "@/lib/supabase/server";
import type {
  AuditEvent,
  Order,
  QuotaReservation,
  SimulatedTransaction,
} from "@/lib/orders/types";

const orderColumns =
  "id, listing_id, holding_id, seller_organisation_id, buyer_organisation_id, offering, quantity, unit_price_aud, amount_aud, status, seller_name, buyer_name, fishery_name, quota_type_name, measurement_kind, unit_label, created_by_email, created_at, updated_at, review_note";

export async function listMyOrders() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .order("created_at", { ascending: false });

  return (data ?? []) as Order[];
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

  return (data ?? []) as Order[];
}

export async function listAllOrders() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .order("created_at", { ascending: false });

  return (data ?? []) as Order[];
}

export async function listOrdersByCreator(email: string) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .eq("created_by_email", email.trim().toLowerCase())
    .order("created_at", { ascending: false });

  return (data ?? []) as Order[];
}

export async function getOrderForListing(listingId: number) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .eq("listing_id", listingId)
    .in("status", [
      "AWAITING_COMPLIANCE",
      "AWAITING_TRANSFER",
      "AWAITING_SETTLEMENT",
      "COMPLETED",
    ])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Order | null) ?? null;
}

export async function getOrder(id: number) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .eq("id", id)
    .maybeSingle();

  return (data as Order | null) ?? null;
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
    .select("id, event_type, entity_type, entity_id, actor_email, payload, created_at")
    .eq("entity_type", "order")
    .eq("entity_id", orderId)
    .order("created_at", { ascending: true });

  return (data ?? []) as AuditEvent[];
}
