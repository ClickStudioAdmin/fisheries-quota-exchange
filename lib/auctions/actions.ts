"use server";

import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { LISTING_OFFERINGS } from "@/lib/listings/types";
import { accountPath } from "@/lib/organisations/paths";
import type { AuctionFormState, BidFormState } from "@/lib/auctions/types";

function read(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createAuctionAction(
  _prev: AuctionFormState,
  formData: FormData,
): Promise<AuctionFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." };
  }

  const organisationId = Number(formData.get("organisation_id"));
  const holdingId = Number(formData.get("holding_id"));
  const offering = read(formData, "offering");
  const quantity = Number(read(formData, "quantity"));
  const startingPrice = Number(read(formData, "starting_price_aud"));
  const increment = Number(read(formData, "bid_increment_aud"));
  const reserveRaw = read(formData, "reserve_price_aud");
  const startsAt = read(formData, "starts_at");
  const endsAt = read(formData, "ends_at");

  if (!Number.isInteger(holdingId) || !Number.isInteger(organisationId)) {
    return { error: "Choose a holding." };
  }

  if (!LISTING_OFFERINGS.includes(offering as (typeof LISTING_OFFERINGS)[number])) {
    return { error: "Choose sale or lease." };
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity must be greater than zero." };
  }

  if (!Number.isFinite(startingPrice) || startingPrice <= 0) {
    return { error: "Starting price must be greater than zero." };
  }

  if (!Number.isFinite(increment) || increment <= 0) {
    return { error: "Bid increment must be greater than zero." };
  }

  const reserve = reserveRaw ? Number(reserveRaw) : null;

  if (reserveRaw && (!Number.isFinite(reserve) || Number(reserve) <= 0)) {
    return { error: "Reserve price must be greater than zero." };
  }

  if (!endsAt) {
    return { error: "End time is required." };
  }

  const { data, error } = await supabase.rpc("create_auction", {
    p_holding_id: holdingId,
    p_offering: offering,
    p_quantity: quantity,
    p_starting_price_aud: startingPrice,
    p_bid_increment_aud: increment,
    p_reserve_price_aud: reserve,
    p_starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
    p_ends_at: new Date(endsAt).toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  const listingId = Number(data);

  if (!Number.isInteger(listingId)) {
    redirect(accountPath(organisationId, "/dashboard/listings"));
  }

  redirect(`/auctions/${listingId}`);
}

export async function placeBidAction(
  _prev: BidFormState,
  formData: FormData,
): Promise<BidFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." };
  }

  const listingId = Number(formData.get("listing_id"));
  const organisationId = Number(formData.get("bidder_organisation_id"));
  const amount = Number(read(formData, "amount_aud"));

  if (!Number.isInteger(listingId) || !Number.isInteger(organisationId)) {
    return { error: "Choose an organisation to bid with." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Bid must be greater than zero." };
  }

  const { error } = await supabase.rpc("place_bid", {
    p_listing_id: listingId,
    p_bidder_organisation_id: organisationId,
    p_amount_aud: amount,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/auctions/${listingId}`);
}

export async function closeAuctionAction(formData: FormData) {
  const supabase = await createClient();
  const listingId = Number(formData.get("listing_id"));

  if (!supabase || !Number.isInteger(listingId)) {
    return;
  }

  const { data, error } = await supabase.rpc("close_auction", {
    p_listing_id: listingId,
  });

  if (error) {
    redirect(`/auctions/${listingId}`);
  }

  if (data) {
    redirect(`/orders/${data}`);
  }

  redirect(`/auctions/${listingId}`);
}
