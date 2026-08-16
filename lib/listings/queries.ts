import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/listings/types";

const columns =
  "id, organisation_id, holding_id, listing_type, offering, quantity, unit_price_aud, expires_at, status, seller_name, fishery_name, stock_name, season_name, quota_type_name, measurement_kind, unit_label, created_by_email, created_at, reviewed_by_email, reviewed_at, review_note, starting_price_aud, reserve_price_aud, bid_increment_aud, starts_at";

export async function listPublishedListings() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("listings")
    .select(columns)
    .eq("status", "PUBLISHED")
    .eq("listing_type", "FIXED_PRICE")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (data ?? []) as Listing[];
}

export async function getListing(id: number) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("listings")
    .select(columns)
    .eq("id", id)
    .maybeSingle();

  return (data as Listing | null) ?? null;
}

export async function listOrganisationListings(organisationId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("listings")
    .select(columns)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  return (data ?? []) as Listing[];
}

export async function listAllListings() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("listings")
    .select(columns)
    .order("created_at", { ascending: false });

  return (data ?? []) as Listing[];
}
