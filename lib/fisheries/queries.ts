import { createClient } from "@/lib/supabase/server";
import type {
  Fishery,
  FisheryRule,
  Jurisdiction,
  QuotaHolding,
  QuotaLedgerEntry,
  QuotaType,
  Season,
  Stock,
} from "@/lib/fisheries/types";

export async function listJurisdictions() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("jurisdictions")
    .select("id, code, name")
    .order("code");
  return (data ?? []) as Jurisdiction[];
}

export async function listFisheries() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("fisheries")
    .select("id, jurisdiction_id, name, code")
    .order("name");
  return (data ?? []) as Fishery[];
}

export async function getFishery(id: number) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("fisheries")
    .select("id, jurisdiction_id, name, code")
    .eq("id", id)
    .maybeSingle();
  return (data as Fishery | null) ?? null;
}

export async function listStocks(fisheryId: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("stocks")
    .select("id, fishery_id, name")
    .eq("fishery_id", fisheryId)
    .order("name");
  return (data ?? []) as Stock[];
}

export async function listSeasons(fisheryId: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("seasons")
    .select("id, fishery_id, name, starts_on, ends_on")
    .eq("fishery_id", fisheryId)
    .order("starts_on", { ascending: false });
  return (data ?? []) as Season[];
}

export async function listQuotaTypes(fisheryId: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("quota_types")
    .select("id, fishery_id, measurement_kind, name, unit_label")
    .eq("fishery_id", fisheryId)
    .order("name");
  return (data ?? []) as QuotaType[];
}

export async function listFisheryRules(fisheryId: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("fishery_rules")
    .select("id, fishery_id, code, value")
    .eq("fishery_id", fisheryId)
    .order("code");
  return (data ?? []) as FisheryRule[];
}

export async function listAllStocks() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("stocks")
    .select("id, fishery_id, name")
    .order("name");
  return (data ?? []) as Stock[];
}

export async function listAllSeasons() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("seasons")
    .select("id, fishery_id, name, starts_on, ends_on")
    .order("starts_on", { ascending: false });
  return (data ?? []) as Season[];
}

export async function listAllQuotaTypes() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("quota_types")
    .select("id, fishery_id, measurement_kind, name, unit_label")
    .order("name");
  return (data ?? []) as QuotaType[];
}

export async function listHoldingsForOrganisation(organisationId: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("quota_holdings")
    .select("id, organisation_id, stock_id, season_id, quota_type_id, quantity")
    .eq("organisation_id", organisationId)
    .order("id");
  return (data ?? []) as QuotaHolding[];
}

export async function listLedger(holdingId: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("quota_ledger")
    .select(
      "id, holding_id, event_type, quantity_delta, quantity_after, note, created_at, created_by_email",
    )
    .eq("holding_id", holdingId)
    .order("id");
  return (data ?? []) as QuotaLedgerEntry[];
}

export async function listAllHoldings() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("quota_holdings")
    .select("id, organisation_id, stock_id, season_id, quota_type_id, quantity")
    .order("id", { ascending: false });
  return (data ?? []) as QuotaHolding[];
}
