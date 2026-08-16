export const LISTING_OFFERINGS = ["SALE", "LEASE"] as const;
export const LISTING_STATUSES = [
  "PENDING_APPROVAL",
  "PUBLISHED",
  "CANCELLED",
  "REJECTED",
] as const;

export type ListingOffering = (typeof LISTING_OFFERINGS)[number];
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export type Listing = {
  id: number;
  organisation_id: number;
  holding_id: number;
  listing_type: "FIXED_PRICE";
  offering: ListingOffering;
  quantity: string;
  unit_price_aud: string;
  expires_at: string;
  status: ListingStatus;
  seller_name: string;
  fishery_name: string;
  stock_name: string;
  season_name: string;
  quota_type_name: string;
  measurement_kind: string;
  unit_label: string;
  created_by_email: string;
  created_at: string;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  review_note: string | null;
};

export function formatAud(value: string | number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value));
}
