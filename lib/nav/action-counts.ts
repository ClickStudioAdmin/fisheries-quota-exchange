import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { listMyOrganisations } from "@/lib/organisations/queries";

export type AdminActionCounts = {
  holdings: number;
  listings: number;
  orders: number;
  total: number;
};

export type MemberActionCounts = {
  holdings: number;
  listings: number;
  orders: number;
  total: number;
  byOrganisation: Record<number, number>;
};

const OPEN_ORDER_STATUSES = [
  "AWAITING_COMPLIANCE",
  "AWAITING_TRANSFER",
  "AWAITING_SETTLEMENT",
] as const;

function addCount(counts: Record<number, number>, organisationId: unknown) {
  const id = Number(organisationId);

  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  counts[id] = (counts[id] ?? 0) + 1;
}

function asCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

function parseAdminActionCounts(data: unknown): AdminActionCounts | null {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const holdingsCount = asCount(record.holdings);
  const listingsCount = asCount(record.listings);
  const ordersCount = asCount(record.orders);

  if (
    holdingsCount == null ||
    listingsCount == null ||
    ordersCount == null
  ) {
    return null;
  }

  return {
    holdings: holdingsCount,
    listings: listingsCount,
    orders: ordersCount,
    total: holdingsCount + listingsCount + ordersCount,
  };
}

async function countAdminActionsFromTables(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
): Promise<AdminActionCounts> {
  const [holdings, listings, orders] = await Promise.all([
    supabase
      .from("quota_holdings")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "PENDING_VERIFICATION"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING_APPROVAL"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", [...OPEN_ORDER_STATUSES]),
  ]);

  const holdingsCount = holdings.count ?? 0;
  const listingsCount = listings.count ?? 0;
  const ordersCount = orders.count ?? 0;

  return {
    holdings: holdingsCount,
    listings: listingsCount,
    orders: ordersCount,
    total: holdingsCount + listingsCount + ordersCount,
  };
}

export const getAdminActionCounts = cache(
  async (): Promise<AdminActionCounts> => {
    const empty = { holdings: 0, listings: 0, orders: 0, total: 0 };
    const supabase = await createClient();

    if (!supabase) {
      return empty;
    }

    const { data, error } = await supabase.rpc("admin_action_counts");
    const parsed = error ? null : parseAdminActionCounts(data);

    if (!parsed) {
      if (error) {
        console.error("admin_action_counts failed", error.message);
      }

      return countAdminActionsFromTables(supabase);
    }

    return parsed;
  },
);

export const getMemberActionCounts = cache(
  async (): Promise<MemberActionCounts> => {
    const empty: MemberActionCounts = {
      holdings: 0,
      listings: 0,
      orders: 0,
      total: 0,
      byOrganisation: {},
    };
    const organisations = await listMyOrganisations();
    const organisationIds = organisations.map((organisation) => organisation.id);

    if (organisationIds.length === 0) {
      return empty;
    }

    const supabase = await createClient();

    if (!supabase) {
      return empty;
    }

    const now = new Date().toISOString();
    const [{ data: holdings }, { data: pendingListings }, { data: endedAuctions }, { data: orders }] =
      await Promise.all([
        supabase
          .from("quota_holdings")
          .select("organisation_id")
          .eq("verification_status", "PENDING_VERIFICATION")
          .in("organisation_id", organisationIds),
        supabase
          .from("listings")
          .select("organisation_id")
          .eq("status", "PENDING_APPROVAL")
          .in("organisation_id", organisationIds),
        supabase
          .from("listings")
          .select("organisation_id")
          .eq("listing_type", "AUCTION")
          .eq("status", "PUBLISHED")
          .lte("expires_at", now)
          .in("organisation_id", organisationIds),
        supabase
          .from("orders")
          .select("buyer_organisation_id, seller_organisation_id")
          .in("status", [...OPEN_ORDER_STATUSES])
          .or(
            `buyer_organisation_id.in.(${organisationIds.join(",")}),seller_organisation_id.in.(${organisationIds.join(",")})`,
          ),
      ]);

    const byOrganisation: Record<number, number> = {};
    const memberOrgs = new Set(organisationIds);

    for (const row of holdings ?? []) {
      addCount(byOrganisation, row.organisation_id);
    }

    for (const row of pendingListings ?? []) {
      addCount(byOrganisation, row.organisation_id);
    }

    for (const row of endedAuctions ?? []) {
      addCount(byOrganisation, row.organisation_id);
    }

    for (const row of orders ?? []) {
      if (memberOrgs.has(Number(row.buyer_organisation_id))) {
        addCount(byOrganisation, row.buyer_organisation_id);
      } else {
        addCount(byOrganisation, row.seller_organisation_id);
      }
    }

    const holdingsCount = (holdings ?? []).length;
    const listingsCount =
      (pendingListings ?? []).length + (endedAuctions ?? []).length;
    const ordersCount = (orders ?? []).length;

    return {
      holdings: holdingsCount,
      listings: listingsCount,
      orders: ordersCount,
      total: holdingsCount + listingsCount + ordersCount,
      byOrganisation,
    };
  },
);
