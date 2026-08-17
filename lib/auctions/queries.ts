import { createClient, getUser } from "@/lib/supabase/server";
import type { Listing } from "@/lib/listings/types";
import { getListing } from "@/lib/listings/queries";
import type { Bid } from "@/lib/auctions/types";
import { auctionHasEnded } from "@/lib/auctions/types";

const listingColumns =
  "id, organisation_id, holding_id, listing_type, offering, quantity, unit_price_aud, expires_at, status, seller_name, fishery_name, stock_name, season_name, quota_type_name, measurement_kind, unit_label, created_by_email, created_at, reviewed_by_email, reviewed_at, review_note, starting_price_aud, reserve_price_aud, bid_increment_aud, starts_at";

export async function listBids(listingId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("bids")
    .select("id, listing_id, organisation_id, bidder_name, amount_aud, created_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  return (data ?? []) as Bid[];
}

export async function ensureAuctionClosed(listing: Listing) {
  if (
    listing.listing_type !== "AUCTION" ||
    listing.status !== "PUBLISHED" ||
    !auctionHasEnded(listing)
  ) {
    return listing;
  }

  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return listing;
  }

  await supabase.rpc("close_auction", { p_listing_id: listing.id });
  return (await getListing(listing.id)) ?? listing;
}
