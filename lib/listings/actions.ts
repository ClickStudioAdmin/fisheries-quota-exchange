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
import { listingApprovalChecks } from "@/lib/listings/approval-checks";
import { selectedComplianceChecks, checklistIsComplete } from "@/lib/orders/checklist";
import { userFacingError } from "@/lib/errors/user-message";
import { accountPath } from "@/lib/organisations/paths";
import { organisationCanSellError } from "@/lib/payments/sell-access";
import { requireTradeReadyError } from "@/lib/organisations/eligibility";
import { getHoldingJurisdictionCode, getFishery, getHolding } from "@/lib/fisheries/queries";
import { fisheryAllowsOffering } from "@/lib/fisheries/types";
import { tradeRequiresQldProfile } from "@/lib/organisations/completeness";
import { qldListingUsage } from "@/lib/listings/quota-usage";
import { requireActiveOrganisationMatch } from "@/lib/organisations/active-session";
import {
  SELLER_ACKNOWLEDGEMENTS,
  requireAcknowledgements,
} from "@/lib/terms/acknowledgements";
import { requireTermsError } from "@/lib/terms/queries";
import { safeNextPath } from "@/lib/auth/paths";
import { notifyListingCancelled, notifyListingCreated, notifyListingPublished, notifyListingRejected } from "@/lib/email/events";

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

  const activeError = await requireActiveOrganisationMatch(organisationId);

  if (activeError) {
    return { error: activeError };
  }

  if (!LISTING_OFFERINGS.includes(offering as (typeof LISTING_OFFERINGS)[number])) {
    return { error: "Choose sale or lease." };
  }

  const holding = await getHolding(holdingId);
  const fishery = holding ? await getFishery(holding.fishery_id) : null;
  if (
    !fishery ||
    !fisheryAllowsOffering(fishery, offering as (typeof LISTING_OFFERINGS)[number])
  ) {
    return {
      error:
        offering === "LEASE"
          ? "This fishery cannot be listed for lease."
          : "This fishery cannot be listed for sale.",
    };
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

  const termsError = await requireTermsError();

  if (termsError) {
    return { error: termsError };
  }

  const jurisdictionCode = await getHoldingJurisdictionCode(holdingId);
  const usage = tradeRequiresQldProfile(jurisdictionCode)
    ? qldListingUsage({
        quantity,
        unusedRaw: read(formData, "unused_quantity"),
        usedRaw: read(formData, "used_quantity"),
        required: true,
      })
    : ({ unused: null, used: null } as const);

  if ("error" in usage) {
    return { error: usage.error };
  }

  const accountError = await requireTradeReadyError(organisationId, {
    requireQldProfile: tradeRequiresQldProfile(jurisdictionCode),
  });

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

  const { data, error } = await supabase.rpc("create_listing", {
    p_holding_id: holdingId,
    p_offering: offering,
    p_quantity: quantity,
    p_unit_price_aud: unitPrice,
    p_expires_at: new Date(expiresAt).toISOString(),
    p_unused_quantity: usage.unused,
    p_used_quantity: usage.used,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  const listingId = Number(data);
  const createdListing =
    Number.isInteger(listingId) ? await getListing(listingId) : null;

  if (createdListing) {
    await notifyListingCreated(createdListing);
  }

  const created =
    createdListing?.status === "PENDING_APPROVAL" ? "pending" : "listing";

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

  const usage = qldListingUsage({
    quantity,
    unusedRaw: read(formData, "unused_quantity"),
    usedRaw: read(formData, "used_quantity"),
  });

  if ("error" in usage) {
    return { error: usage.error };
  }

  const { error } = await supabase.rpc("update_listing", {
    p_listing_id: listingId,
    p_quantity: quantity,
    p_unit_price_aud: unitPrice,
    p_unused_quantity: usage.unused,
    p_used_quantity: usage.used,
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

  const listing = await getListing(listingId);
  const { error } = await supabase.rpc("cancel_listing", {
    p_listing_id: listingId,
  });

  if (error) {
    return;
  }

  if (listing) {
    await notifyListingCancelled(listing);
  }

  redirect(safeNextPath(next));
}

function refreshAfterListingReview() {
  revalidatePath("/admin/listings");
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

export async function saveListingApprovalChecklistAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return { error: "Not a platform admin." };
  }

  const listingId = Number(formData.get("listing_id"));

  if (!Number.isInteger(listingId)) {
    return { error: "Listing not found." };
  }

  const listing = await getListing(listingId);

  if (!listing || listing.status !== "PENDING_APPROVAL") {
    return { error: "Listing is not waiting for approval." };
  }

  const jurisdictionCode = await getHoldingJurisdictionCode(listing.holding_id);
  const completed = selectedComplianceChecks(
    listingApprovalChecks(jurisdictionCode, listing.listing_type),
    formData.getAll("checks").map(String),
  );

  const { error } = await supabase.rpc("save_listing_approval_checklist", {
    p_listing_id: listing.id,
    p_completed: completed,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/admin/listings");
  return { message: "Progress saved." };
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

  const listing = await getListing(listingId);

  if (!listing || listing.status !== "PENDING_APPROVAL") {
    return;
  }

  const jurisdictionCode = await getHoldingJurisdictionCode(listing.holding_id);
  if (
    !checklistIsComplete(
      listingApprovalChecks(jurisdictionCode, listing.listing_type),
      listing.approval_checklist,
    )
  ) {
    return;
  }

  const { error } = await supabase.rpc("approve_listing", {
    p_listing_id: listingId,
    p_note: note || null,
  });

  if (error) {
    return;
  }

  if (listing) {
    await notifyListingPublished(listing);
  }

  refreshAfterListingReview();
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

  const listing = await getListing(listingId);
  const { error } = await supabase.rpc("reject_listing", {
    p_listing_id: listingId,
    p_note: note || null,
  });

  if (error) {
    return;
  }

  if (listing) {
    await notifyListingRejected(listing, note);
  }

  refreshAfterListingReview();
}
