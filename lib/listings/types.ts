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

export function listingTypeLabel(type: ListingType) {
  return type === "AUCTION" ? "Auction" : "Fixed price";
}

export function listingHref(listing: Pick<Listing, "id" | "listing_type">) {
  return listing.listing_type === "AUCTION"
    ? `/auctions/${listing.id}`
    : `/marketplace/${listing.id}`;
}

export function listingOfferingLabel(offering: ListingOffering) {
  return offering === "SALE" ? "Sale" : "Lease";
}

export function listingStatusLabel(status: ListingStatus) {
  switch (status) {
    case "PENDING_APPROVAL":
      return "Pending approval";
    case "PUBLISHED":
      return "Published";
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
