"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  LISTING_OFFERINGS,
  listingReviewPath,
  parseListingReviewIds,
} from "@/lib/listings/types";
import { getListing, listAllListings } from "@/lib/listings/queries";
import { userFacingError } from "@/lib/errors/user-message";
import { accountPath } from "@/lib/organisations/paths";
import { organisationCanSellError } from "@/lib/payments/sell-access";
import { safeNextPath } from "@/lib/auth/paths";

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
  const created =
    Number.isInteger(listingId) &&
    (await getListing(listingId))?.status === "PENDING_APPROVAL"
      ? "pending"
      : "listing";

  revalidatePath("/dashboard/holdings");
  revalidatePath("/dashboard/listings");
  redirect(
    accountPath(organisationId, "/dashboard/holdings", {
      created,
      ...(Number.isInteger(listingId) ? { listing: String(listingId) } : {}),
    }),
  );
}

export async function updateListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." };
  }

  const listingId = Number(formData.get("listing_id"));
  const quantity = Number(read(formData, "quantity"));
  const unitPrice = Number(read(formData, "unit_price_aud"));

  if (!Number.isInteger(listingId)) {
    return { error: "Listing not found." };
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity must be greater than zero." };
  }

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { error: "Price must be greater than zero." };
  }

  const { error } = await supabase.rpc("update_listing", {
    p_listing_id: listingId,
    p_quantity: quantity,
    p_unit_price_aud: unitPrice,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/marketplace");
  revalidatePath("/dashboard/listings");
  revalidatePath("/dashboard/holdings", "layout");
  return { message: "Listing updated." };
}

export async function cancelListingAction(formData: FormData) {
  const supabase = await createClient();
  const listingId = Number(formData.get("listing_id"));
  const next = read(formData, "next") || "/marketplace";

  if (!supabase || !Number.isInteger(listingId)) {
    return;
  }

  const { error } = await supabase.rpc("cancel_listing", {
    p_listing_id: listingId,
  });

  if (error) {
    return;
  }

  redirect(safeNextPath(next));
}

function redirectAfterListingReview(formData: FormData) {
  redirect(
    listingReviewPath(formData.getAll("review_queue").map(String)),
  );
}

export async function startListingReviewAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const selected = parseListingReviewIds(
    formData.getAll("ids").map(String).join(","),
  );

  if (selected.length === 0) {
    redirect("/admin/listings");
  }

  const { listings } = await listAllListings();
  const pending = new Set(
    listings
      .filter((listing) => listing.status === "PENDING_APPROVAL")
      .map((listing) => listing.id),
  );

  redirect(
    listingReviewPath(selected.filter((id) => pending.has(id))),
  );
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

  redirectAfterListingReview(formData);
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

  redirectAfterListingReview(formData);
}
