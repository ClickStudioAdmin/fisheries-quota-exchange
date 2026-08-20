import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import { listLatestComplianceUpdateNotesByOrderIds } from "@/lib/orders/queries";
import { listMyOrganisations } from "@/lib/organisations/queries";
import { canBuyForOrganisation } from "@/lib/organisations/permissions";
import {
  memberActionCountBuckets,
  organisationNeedsAttentionItems,
  type NeedsAttentionListing,
  type NeedsAttentionOrder,
} from "@/lib/organisations/needs-attention";
import { listPaymentStatusesByOrderIds } from "@/lib/payments/queries";
import { listTransferApplicationsByOrderIds } from "@/lib/transfers/queries";

export type AdminActionCounts = {
  holdings: number;
  listings: number;
  orders: number;
  total: number;
};

export type MemberOrgActionCounts = {
  holdings: number;
  listings: number;
  orders: number;
  overview: number;
  total: number;
};

export type MemberActionCounts = MemberOrgActionCounts & {
  byOrganisation: Record<number, MemberOrgActionCounts>;
};

const OPEN_ORDER_STATUSES = [
  "AWAITING_PAYMENT",
  "AWAITING_COMPLIANCE",
  "AWAITING_TRANSFER",
  "AWAITING_SETTLEMENT",
] as const;

const ACTION_ORDER_STATUSES = [
  "AWAITING_PAYMENT",
  "AWAITING_COMPLIANCE",
  "AWAITING_TRANSFER",
] as const;

function emptyOrgCounts(): MemberOrgActionCounts {
  return { holdings: 0, listings: 0, orders: 0, overview: 0, total: 0 };
}

export function memberCountsForOrganisation(
  counts: MemberActionCounts,
  organisationId: number | null | undefined,
): MemberOrgActionCounts {
  if (organisationId != null && counts.byOrganisation[organisationId]) {
    return counts.byOrganisation[organisationId];
  }

  return {
    holdings: counts.holdings,
    listings: counts.listings,
    orders: counts.orders,
    overview: counts.overview,
    total: counts.total,
  };
}

function finishOrgCounts(counts: MemberOrgActionCounts) {
  counts.total = counts.holdings + counts.listings + counts.orders;
  return counts;
}

function bumpOrg(
  byOrganisation: Record<number, MemberOrgActionCounts>,
  organisationId: unknown,
  field: "holdings" | "listings",
) {
  const id = Number(organisationId);
  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  const current = byOrganisation[id] ?? emptyOrgCounts();
  current[field] += 1;
  byOrganisation[id] = finishOrgCounts(current);
}

function asOrderOffering(value: unknown): "SALE" | "LEASE" {
  return value === "LEASE" ? "LEASE" : "SALE";
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
      ...emptyOrgCounts(),
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
    const [
      { data: holdings },
      { data: pendingListings },
      { data: endedAuctions },
      { data: orderRows },
      fisheries,
      jurisdictions,
    ] = await Promise.all([
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
        .select("id, organisation_id, listing_type, status, expires_at, fishery_name")
        .eq("listing_type", "AUCTION")
        .eq("status", "PUBLISHED")
        .lte("expires_at", now)
        .in("organisation_id", organisationIds),
      supabase
        .from("orders")
        .select(
          "id, buyer_organisation_id, seller_organisation_id, status, fishery_name, offering",
        )
        .in("status", [...ACTION_ORDER_STATUSES])
        .or(
          `buyer_organisation_id.in.(${organisationIds.join(",")}),seller_organisation_id.in.(${organisationIds.join(",")})`,
        ),
      listFisheries(),
      listJurisdictions(),
    ]);

    const orders: NeedsAttentionOrder[] = (orderRows ?? []).flatMap((row) => {
      const id = Number(row.id);
      const buyerOrganisationId = Number(row.buyer_organisation_id);
      const sellerOrganisationId = Number(row.seller_organisation_id);
      const status = String(row.status ?? "");

      if (
        !Number.isInteger(id) ||
        id <= 0 ||
        !Number.isInteger(buyerOrganisationId) ||
        !Number.isInteger(sellerOrganisationId) ||
        !status
      ) {
        return [];
      }

      return [
        {
          id,
          status,
          fishery_name: String(row.fishery_name ?? ""),
          offering: asOrderOffering(row.offering),
          buyer_organisation_id: buyerOrganisationId,
          seller_organisation_id: sellerOrganisationId,
        },
      ];
    });
    const listings: NeedsAttentionListing[] = (endedAuctions ?? []).flatMap(
      (row) => {
        const id = Number(row.id);
        const organisationId = Number(row.organisation_id);

        if (!Number.isInteger(id) || id <= 0) {
          return [];
        }

        return [
          {
            id,
            organisation_id: Number.isInteger(organisationId)
              ? organisationId
              : undefined,
            listing_type: String(row.listing_type ?? "AUCTION"),
            status: String(row.status ?? "PUBLISHED"),
            expires_at: String(row.expires_at ?? now),
            fishery_name: String(row.fishery_name ?? ""),
          },
        ];
      },
    );

    const [transferByOrderId, complianceNotesByOrderId, paymentStatusByOrderId] =
      await Promise.all([
        listTransferApplicationsByOrderIds(
          orders
            .filter((order) => order.status === "AWAITING_TRANSFER")
            .map((order) => order.id),
        ),
        listLatestComplianceUpdateNotesByOrderIds(
          orders
            .filter((order) => order.status === "AWAITING_COMPLIANCE")
            .map((order) => order.id),
        ),
        listPaymentStatusesByOrderIds(
          orders
            .filter((order) => order.status === "AWAITING_PAYMENT")
            .map((order) => order.id),
        ),
      ]);

    const byOrganisation: Record<number, MemberOrgActionCounts> = {};
    for (const organisationId of organisationIds) {
      byOrganisation[organisationId] = emptyOrgCounts();
    }

    for (const row of holdings ?? []) {
      bumpOrg(byOrganisation, row.organisation_id, "holdings");
    }

    for (const row of pendingListings ?? []) {
      bumpOrg(byOrganisation, row.organisation_id, "listings");
    }

    for (const organisation of organisations) {
      if (!canBuyForOrganisation(organisation.role)) {
        continue;
      }

      const items = organisationNeedsAttentionItems({
        organisationId: organisation.id,
        canManage: true,
        orders,
        listings,
        transferByOrderId,
        fisheries,
        jurisdictions,
        complianceNotesByOrderId,
        paymentStatusByOrderId,
      });
      const buckets = memberActionCountBuckets(items);
      const current = byOrganisation[organisation.id] ?? emptyOrgCounts();
      current.orders += buckets.orders;
      current.listings += buckets.listings;
      current.overview += buckets.overview;
      byOrganisation[organisation.id] = finishOrgCounts(current);
    }

    const totals = emptyOrgCounts();
    for (const orgCounts of Object.values(byOrganisation)) {
      totals.holdings += orgCounts.holdings;
      totals.listings += orgCounts.listings;
      totals.orders += orgCounts.orders;
      totals.overview += orgCounts.overview;
    }

    return {
      ...finishOrgCounts(totals),
      byOrganisation,
    };
  },
);
