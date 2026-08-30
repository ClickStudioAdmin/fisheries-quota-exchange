export const LISTING_OFFERINGS = ["SALE", "LEASE"] as const;
export const LISTING_STATUSES = [
  "PENDING_APPROVAL",
  "PUBLISHED",
  "RESERVED",
  "SOLD",
  "UNSOLD",
  "CANCELLED",
  "REJECTED",
] as const;

export type ListingOffering = (typeof LISTING_OFFERINGS)[number];
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export type ListingType = "FIXED_PRICE" | "AUCTION";

export type Listing = {
  id: number;
  organisation_id: number;
  holding_id: number;
  listing_type: ListingType;
  offering: ListingOffering;
  quantity: string;
  unused_quantity: string | null;
  used_quantity: string | null;
  unit_price_aud: string;
  expires_at: string;
  status: ListingStatus;
  seller_name: string;
  fishery_name: string;
  quota_type_name: string;
  measurement_kind: string;
  unit_label: string;
  created_by_email: string;
  created_at: string;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  approval_checklist: string[];
  starting_price_aud: string | null;
  reserve_price_aud: string | null;
  bid_increment_aud: string | null;
  starts_at: string | null;
};

export function formatAud(value: string | number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value));
}

export function unitPriceSuffix(unit: string | null | undefined) {
  const trimmed = String(unit ?? "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.toLowerCase() === "units" ? "Unit" : trimmed;
}

export function formatAudPerUnit(value: string | number, unit: string) {
  return `${formatAud(value)} / ${unitPriceSuffix(unit)}`;
}

export function listingTotalAud(
  quantity: string | number,
  unitPrice: string | number,
) {
  const total = Number(quantity) * Number(unitPrice);
  return Number.isFinite(total) ? total : null;
}

export function formatListingTotal(
  quantity: string | number,
  unitPrice: string | number,
) {
  const total = listingTotalAud(quantity, unitPrice);
  return total == null ? "—" : formatAud(total);
}

export function listingTypeLabel(type: ListingType) {
  return type === "AUCTION" ? "Auction" : "Fixed price";
}

export function listingHref(listing: Pick<Listing, "id" | "listing_type">) {
  return listing.listing_type === "AUCTION"
    ? `/auctions/${listing.id}`
    : `/marketplace/${listing.id}`;
}

export function listingIsOpen(listing: Pick<Listing, "status">) {
  return listing.status === "PENDING_APPROVAL" || listing.status === "PUBLISHED";
}

export function canEditListingPrice(
  listing: Pick<Listing, "listing_type" | "status">,
) {
  return listing.listing_type === "FIXED_PRICE" && listingIsOpen(listing);
}

export function listingEditMaxQuantity(
  listingQuantity: string | number,
  holdingQuantity: string | number | null | undefined,
  committed: number,
) {
  const current = Number(listingQuantity);
  const holding = Number(holdingQuantity);

  if (!Number.isFinite(current) || current <= 0) {
    return "0";
  }

  if (!Number.isFinite(holding)) {
    return String(current);
  }

  const max = holding - committed + current;
  return String(Math.max(max, current));
}

export function canCancelOpenListing(
  listing: Pick<Listing, "listing_type" | "status">,
  bidCount = 0,
) {
  if (!listingIsOpen(listing)) {
    return false;
  }

  if (listing.listing_type === "AUCTION" && bidCount > 0) {
    return false;
  }

  return true;
}

export function listingOfferingLabel(offering: ListingOffering) {
  return offering === "SALE" ? "Sale" : "Lease";
}

export function openListingCountsByFisheryName(listings: Listing[]) {
  const counts = new Map<string, { sale: number; lease: number }>();
  const now = Date.now();

  for (const listing of listings) {
    if (
      listing.listing_type === "FIXED_PRICE" &&
      new Date(listing.expires_at).getTime() <= now
    ) {
      continue;
    }

    const current = counts.get(listing.fishery_name) ?? { sale: 0, lease: 0 };
    if (listing.offering === "LEASE") {
      current.lease += 1;
    } else {
      current.sale += 1;
    }
    counts.set(listing.fishery_name, current);
  }

  return Object.fromEntries(counts);
}

export function listingStatusLabel(status: ListingStatus) {
  switch (status) {
    case "PENDING_APPROVAL":
      return "Pending approval";
    case "PUBLISHED":
      return "Live";
    case "RESERVED":
      return "Reserved";
    case "SOLD":
      return "Sold";
    case "UNSOLD":
      return "Unsold";
    case "CANCELLED":
      return "Cancelled";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

export function parseListingReviewIds(value?: string | null) {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(/[,\s]+/)
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
}

export function listingReviewPath(ids: Array<string | number>) {
  const unique = parseListingReviewIds(ids.join(","));

  if (unique.length === 0) {
    return "/admin/listings";
  }

  return `/admin/listings?review=${unique.join(",")}`;
}
