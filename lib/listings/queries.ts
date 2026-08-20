import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { userFacingError } from "@/lib/errors/user-message";
import type { Listing } from "@/lib/listings/types";
import { parseComplianceChecklist } from "@/lib/orders/checklist";

const columns =
  "id, organisation_id, holding_id, listing_type, offering, quantity, unit_price_aud, expires_at, status, seller_name, fishery_name, quota_type_name, measurement_kind, unit_label, created_by_email, created_at, reviewed_by_email, reviewed_at, review_note, approval_checklist, starting_price_aud, reserve_price_aud, bid_increment_aud, starts_at";

type ListingQuery = PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}>;

function mapListing(row: unknown): Listing | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  return {
    ...(row as Listing),
    approval_checklist: parseComplianceChecklist(record.approval_checklist),
  };
}

function mapListings(data: unknown): Listing[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map(mapListing)
    .filter((row): row is Listing => row != null);
}

async function listingRows(query: ListingQuery): Promise<Listing[]> {
  const { data, error } = await query;

  if (error) {
    console.error("listings query failed", error.message);
    return [];
  }

  return mapListings(data);
}

export async function listMarketplaceListings() {
  const supabase = await createClient();
  if (!supabase) return [];

  return listingRows(
    supabase
      .from("listings")
      .select(columns)
      .eq("status", "PUBLISHED")
      .order("created_at", { ascending: false }),
  );
}

export async function getListing(id: number) {
  const supabase = (await createClient()) ?? createServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("listings")
    .select(columns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getListing failed", error.message);
    return null;
  }

  return mapListing(data);
}

export async function listOrganisationListings(organisationId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  return listingRows(
    supabase
      .from("listings")
      .select(columns)
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false }),
  );
}

export async function listAllListings() {
  const supabase = await createClient();
  if (!supabase) {
    return { listings: [] as Listing[], error: "Database is not configured." };
  }

  const { data, error } = await supabase.rpc("admin_list_listings");

  if (error) {
    console.error("listAllListings failed", error.message);
    return { listings: [] as Listing[], error: userFacingError(error) };
  }

  return { listings: mapListings(data) };
}

export async function listListingsByCreator(email: string) {
  const supabase = await createClient();
  if (!supabase) return [];

  return listingRows(
    supabase
      .from("listings")
      .select(columns)
      .eq("created_by_email", email.trim().toLowerCase())
      .order("created_at", { ascending: false }),
  );
}

export async function listListingsByHolding(holdingId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  return listingRows(
    supabase
      .from("listings")
      .select(columns)
      .eq("holding_id", holdingId)
      .order("created_at", { ascending: false }),
  );
}
