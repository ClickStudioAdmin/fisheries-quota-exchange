"use server";

import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient, getUser } from "@/lib/supabase/server";
import { LISTING_OFFERINGS } from "@/lib/listings/types";
import { userFacingError } from "@/lib/errors/user-message";
import { accountPath } from "@/lib/organisations/paths";
import { organisationCanSellError } from "@/lib/payments/sell-access";

export type ListingFormState = {
  error?: string;
  message?: string;
};

function read(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." };
  }

  const organisationId = Number(formData.get("organisation_id"));
  const holdingId = Number(formData.get("holding_id"));
  const offering = read(formData, "offering");
  const quantity = Number(read(formData, "quantity"));
  const unitPrice = Number(read(formData, "unit_price_aud"));
  const expiresAt = read(formData, "expires_at");

  if (!Number.isInteger(holdingId) || !Number.isInteger(organisationId)) {
    return { error: "Choose a holding." };
  }

  if (!LISTING_OFFERINGS.includes(offering as (typeof LISTING_OFFERINGS)[number])) {
    return { error: "Choose sale or lease." };
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity must be greater than zero." };
  }

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { error: "Price must be greater than zero." };
  }

  if (!expiresAt) {
    return { error: "Expiry is required." };
  }

  const sellError = await organisationCanSellError(organisationId);

  if (sellError) {
    return { error: sellError };
  }

  const { data, error } = await supabase.rpc("create_listing", {
    p_holding_id: holdingId,
    p_offering: offering,
    p_quantity: quantity,
    p_unit_price_aud: unitPrice,
    p_expires_at: new Date(expiresAt).toISOString(),
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  const listingId = Number(data);

  if (!Number.isInteger(listingId)) {
    redirect(accountPath(organisationId, "/dashboard/listings"));
  }

  redirect(`/marketplace/${listingId}`);
}

export async function cancelListingAction(formData: FormData) {
  const supabase = await createClient();
  const listingId = Number(formData.get("listing_id"));
  const next = read(formData, "next") || "/marketplace";

  if (!supabase || !Number.isInteger(listingId)) {
    return;
  }

  await supabase.rpc("cancel_listing", { p_listing_id: listingId });
  redirect(next);
}

export async function approveListingAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const listingId = Number(formData.get("listing_id"));
  const note = read(formData, "review_note");

  if (!Number.isInteger(listingId)) {
    return;
  }

  const { error } = await supabase.rpc("approve_listing", {
    p_listing_id: listingId,
    p_note: note || null,
  });

  if (error) {
    return;
  }

  redirect("/admin/listings");
}

export async function rejectListingAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const listingId = Number(formData.get("listing_id"));
  const note = read(formData, "review_note");

  if (!Number.isInteger(listingId)) {
    return;
  }

  const { error } = await supabase.rpc("reject_listing", {
    p_listing_id: listingId,
    p_note: note || null,
  });

  if (error) {
    return;
  }

  redirect("/admin/listings");
}
