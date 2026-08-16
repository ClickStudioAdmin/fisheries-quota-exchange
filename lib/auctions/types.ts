import type { Listing } from "@/lib/listings/types";

export type Bid = {
  id: number;
  listing_id: number;
  organisation_id: number;
  bidder_name: string;
  amount_aud: string;
  created_at: string;
};

export type BidFormState = {
  error?: string;
};

export type AuctionFormState = {
  error?: string;
};

export function minimumBid(listing: Listing, bidCount: number) {
  if (bidCount === 0) {
    return Number(listing.starting_price_aud ?? listing.unit_price_aud);
  }

  return Number(listing.unit_price_aud) + Number(listing.bid_increment_aud ?? 0);
}

export function auctionHasStarted(listing: Listing, at = new Date()) {
  if (!listing.starts_at) {
    return true;
  }

  return new Date(listing.starts_at) <= at;
}

export function auctionHasEnded(listing: Listing, at = new Date()) {
  return new Date(listing.expires_at) <= at;
}

export function auctionIsLive(listing: Listing, at = new Date()) {
  return (
    listing.listing_type === "AUCTION" &&
    listing.status === "PUBLISHED" &&
    auctionHasStarted(listing, at) &&
    !auctionHasEnded(listing, at)
  );
}
