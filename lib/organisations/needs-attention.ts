export type NeedsAttentionItem = {
  key: string;
  href: string;
  title: string;
  detail?: string;
  actionLabel: string;
};

export type NeedsAttentionOrder = {
  id: number;
  status: string;
  fishery_name: string;
  offering: "SALE" | "LEASE";
  buyer_organisation_id: number;
  seller_organisation_id: number;
};

export type NeedsAttentionListing = {
  id: number;
  listing_type: string;
  status: string;
  expires_at: string;
  fishery_name: string;
  organisation_id?: number;
};

export type NeedsAttentionTransfer = {
  process_code: string;
  status: string;
};

export type NeedsAttentionComplianceNotes = {
  buyer: string | null;
  seller: string | null;
};

const CLOSED_ORDER_STATUSES = new Set([
  "CANCELLED",
  "REJECTED",
  "COMPLETED",
]);

const PAYMENT_NO_LONGER_DUE = new Set(["PAID", "EXPIRED", "FAILED"]);

export function orderPaymentActionIsDue(
  orderStatus: string,
  paymentStatus?: string | null,
) {
  if (orderStatus !== "AWAITING_PAYMENT") {
    return false;
  }

  if (paymentStatus && PAYMENT_NO_LONGER_DUE.has(paymentStatus.toUpperCase())) {
    return false;
  }

  return true;
}

export function memberActionCountBuckets(items: readonly NeedsAttentionItem[]) {
  let orders = 0;
  let listings = 0;

  for (const item of items) {
    if (item.key.startsWith("auction-")) {
      listings += 1;
    } else {
      orders += 1;
    }
  }

  return {
    orders,
    listings,
    overview: items.length,
  };
}

function usesSimulatedTransfer(
  order: Pick<NeedsAttentionOrder, "offering" | "fishery_name">,
  application: NeedsAttentionTransfer | undefined,
  fisheries: readonly { name: string; jurisdiction_id: number }[],
  jurisdictions: readonly { id: number; code: string }[],
) {
  if (application?.process_code) {
    return application.process_code === "SIMULATED";
  }

  const fishery = fisheries.find((item) => item.name === order.fishery_name);
  const jurisdictionCode =
    jurisdictions.find((item) => item.id === fishery?.jurisdiction_id)?.code ??
    null;

  return jurisdictionCode !== "QLD";
}

function qldTransferActionLabel(status: string | null) {
  if (status == null || status === "READY") {
    return "Prepare transfer documents";
  }

  if (status === "DOCUMENT_GENERATED" || status === "AWAITING_SIGNED_PACK") {
    return "Sign transfer documents";
  }

  if (status === "ACTION_REQUIRED") {
    return "Update transfer details";
  }

  return null;
}

export function organisationNeedsAttentionItems(input: {
  organisationId: number;
  canManage: boolean;
  orders: readonly NeedsAttentionOrder[];
  listings: readonly NeedsAttentionListing[];
  transferByOrderId?: ReadonlyMap<number, NeedsAttentionTransfer>;
  fisheries?: readonly { name: string; jurisdiction_id: number }[];
  jurisdictions?: readonly { id: number; code: string }[];
  complianceNotesByOrderId?: ReadonlyMap<number, NeedsAttentionComplianceNotes>;
  paymentStatusByOrderId?: ReadonlyMap<number, string>;
  now?: Date;
}): NeedsAttentionItem[] {
  if (!input.canManage || input.organisationId <= 0) {
    return [];
  }

  const items: NeedsAttentionItem[] = [];
  const fisheries = input.fisheries ?? [];
  const jurisdictions = input.jurisdictions ?? [];
  const transfers = input.transferByOrderId ?? new Map();
  const notesByOrderId = input.complianceNotesByOrderId ?? new Map();
  const paymentStatusByOrderId = input.paymentStatusByOrderId ?? new Map();
  const now = input.now ?? new Date();

  for (const order of input.orders) {
    if (CLOSED_ORDER_STATUSES.has(order.status)) {
      continue;
    }

    const isBuyer = order.buyer_organisation_id === input.organisationId;
    const isSeller = order.seller_organisation_id === input.organisationId;

    if (!isBuyer && !isSeller) {
      continue;
    }

    if (
      isBuyer &&
      orderPaymentActionIsDue(
        order.status,
        paymentStatusByOrderId.get(order.id),
      )
    ) {
      items.push({
        key: `pay-${order.id}`,
        href: `/orders/${order.id}`,
        title: `Pay order ${order.id}`,
        detail: order.fishery_name,
        actionLabel: "Go to order",
      });
    }

    if (order.status === "AWAITING_COMPLIANCE") {
      const notes = notesByOrderId.get(order.id);
      if (
        (isBuyer && notes?.buyer) ||
        (isSeller && notes?.seller)
      ) {
        items.push({
          key: `compliance-update-${order.id}`,
          href: `/orders/${order.id}`,
          title: `Update order ${order.id} details`,
          detail: order.fishery_name,
          actionLabel: "Go to order",
        });
      }
    }

    if (order.status === "AWAITING_TRANSFER") {
      const application = transfers.get(order.id);
      if (usesSimulatedTransfer(order, application, fisheries, jurisdictions)) {
        continue;
      }

      const action = qldTransferActionLabel(application?.status ?? "READY");
      if (action) {
        items.push({
          key: `transfer-${order.id}`,
          href: `/orders/${order.id}`,
          title: `${action} for order ${order.id}`,
          detail: order.fishery_name,
          actionLabel: "Go to order",
        });
      }
    }
  }

  for (const listing of input.listings) {
    if (
      listing.organisation_id != null &&
      listing.organisation_id !== input.organisationId
    ) {
      continue;
    }

    if (
      listing.listing_type !== "AUCTION" ||
      listing.status !== "PUBLISHED" ||
      new Date(listing.expires_at) > now
    ) {
      continue;
    }

    items.push({
      key: `auction-${listing.id}`,
      href: `/auctions/${listing.id}`,
      title: `Close auction ${listing.id}`,
      detail: listing.fishery_name,
      actionLabel: "Go to auction",
    });
  }

  return items;
}
