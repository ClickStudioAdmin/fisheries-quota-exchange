import { createClient, getUser } from "@/lib/supabase/server";
import type { Listing } from "@/lib/listings/types";
import { getListing } from "@/lib/listings/queries";
import type { Bid } from "@/lib/auctions/types";
import { auctionHasEnded } from "@/lib/auctions/types";

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

export async function listingIdsWithBids(listingIds: number[]) {
  const ids = [...new Set(listingIds.filter((id) => Number.isInteger(id)))];
  if (ids.length === 0) {
    return new Set<number>();
  }

  const supabase = await createClient();
  if (!supabase) {
    return new Set<number>();
  }

  const { data } = await supabase
    .from("bids")
    .select("listing_id")
    .in("listing_id", ids);

  return new Set(
    (data ?? [])
      .map((row) => Number((row as { listing_id: number }).listing_id))
      .filter((id) => Number.isInteger(id)),
  );
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
