"use server";

import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { LISTING_OFFERINGS } from "@/lib/listings/types";
import { accountPath } from "@/lib/organisations/paths";
import { organisationCanSellError } from "@/lib/payments/sell-access";
import { requireBusinessAccountError } from "@/lib/organisations/eligibility";
import { canBuyForOrganisation } from "@/lib/organisations/permissions";
import {
  ACTIVE_ORGANISATION_REQUIRED_MESSAGE,
  getActiveOrganisation,
  requireActiveOrganisationMatch,
} from "@/lib/organisations/active-session";
import {
  BUYER_BID_ACKNOWLEDGEMENTS,
  SELLER_ACKNOWLEDGEMENTS,
  requireAcknowledgements,
} from "@/lib/terms/acknowledgements";
import { requireTermsError } from "@/lib/terms/queries";
import { userFacingError } from "@/lib/errors/user-message";
import type { AuctionFormState, BidFormState } from "@/lib/auctions/types";
import { getListing } from "@/lib/listings/queries";
import { listBids } from "@/lib/auctions/queries";
import { getOrder } from "@/lib/orders/queries";
import {
  notifyAuctionClosed,
  notifyBidPlaced,
  notifyListingCreated,
} from "@/lib/email/events";

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

  const activeError = await requireActiveOrganisationMatch(organisationId);

  if (activeError) {
    return { error: activeError };
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

  const termsError = await requireTermsError();

  if (termsError) {
    return { error: termsError };
  }

  const accountError = await requireBusinessAccountError();

  if (accountError) {
    return { error: accountError };
  }

  const ackError = requireAcknowledgements(formData, SELLER_ACKNOWLEDGEMENTS);

  if (ackError) {
    return { error: ackError };
  }

  const sellError = await organisationCanSellError(organisationId);

  if (sellError) {
    return { error: sellError };
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
    return { error: userFacingError(error) };
  }

  const listingId = Number(data);

  if (!Number.isInteger(listingId)) {
    redirect(accountPath(organisationId, "/dashboard/listings"));
  }

  const listing = await getListing(listingId);
  if (listing) {
    await notifyListingCreated(listing);
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
  const active = await getActiveOrganisation();
  const amount = Number(read(formData, "amount_aud"));

  if (!Number.isInteger(listingId)) {
    return { error: "Listing not found." };
  }

  if (!active) {
    return { error: ACTIVE_ORGANISATION_REQUIRED_MESSAGE };
  }

  if (!canBuyForOrganisation(active.role)) {
    return { error: "Only owners and admins can bid for this business." };
  }

  const organisationId = active.id;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Bid must be greater than zero." };
  }

  const termsError = await requireTermsError();

  if (termsError) {
    return { error: termsError };
  }

  const accountError = await requireBusinessAccountError();

  if (accountError) {
    return { error: accountError };
  }

  const ackError = requireAcknowledgements(formData, BUYER_BID_ACKNOWLEDGEMENTS);

  if (ackError) {
    return { error: ackError };
  }

  const listing = await getListing(listingId);
  const previous = (await listBids(listingId))[0] ?? null;

  if (listing?.organisation_id === organisationId) {
    return {
      error:
        "You cannot bid on this auction while using the seller’s business. Switch business to bid as another business.",
    };
  }
  const { error } = await supabase.rpc("place_bid", {
    p_listing_id: listingId,
    p_bidder_organisation_id: organisationId,
    p_amount_aud: amount,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  if (listing) {
    await notifyBidPlaced({
      listing,
      amount,
      bidderOrganisationId: organisationId,
      previous,
    });
  }

  redirect(`/auctions/${listingId}`);
}

export async function closeAuctionAction(formData: FormData) {
  const supabase = await createClient();
  const listingId = Number(formData.get("listing_id"));

  if (!supabase || !Number.isInteger(listingId)) {
    return;
  }

  const listing = await getListing(listingId);
  const bids = await listBids(listingId);
  const { data, error } = await supabase.rpc("close_auction", {
    p_listing_id: listingId,
  });

  if (error) {
    redirect(`/auctions/${listingId}`);
  }

  const order = data ? await getOrder(Number(data)) : null;
  if (listing) {
    await notifyAuctionClosed({ listing, bids, order });
  }

  if (data) {
    redirect(`/orders/${data}`);
  }

  redirect(`/auctions/${listingId}`);
}
