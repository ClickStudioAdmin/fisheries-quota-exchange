export type NeedsAttentionItem = {
  key: string;
  href: string;
  label: string;
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
};

export type NeedsAttentionTransfer = {
  process_code: string;
  status: string;
};

export type NeedsAttentionComplianceNotes = {
  buyer: string | null;
  seller: string | null;
};

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
  const now = input.now ?? new Date();

  for (const order of input.orders) {
    const isBuyer = order.buyer_organisation_id === input.organisationId;
    const isSeller = order.seller_organisation_id === input.organisationId;

    if (!isBuyer && !isSeller) {
      continue;
    }

    if (isBuyer && order.status === "AWAITING_PAYMENT") {
      items.push({
        key: `pay-${order.id}`,
        href: `/orders/${order.id}`,
        label: `Pay order ${order.id} · ${order.fishery_name}`,
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
          label: `Update order ${order.id} details · ${order.fishery_name}`,
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
          label: `${action} for order ${order.id} · ${order.fishery_name}`,
        });
      }
    }
  }

  for (const listing of input.listings) {
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
      label: `Close auction ${listing.id} · ${listing.fishery_name}`,
    });
  }

  return items;
}
