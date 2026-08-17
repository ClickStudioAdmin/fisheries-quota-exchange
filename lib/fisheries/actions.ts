"use server";

import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient, getUser } from "@/lib/supabase/server";
import { MEASUREMENT_KINDS } from "@/lib/fisheries/types";

export type AdminFormState = {
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." as const, supabase: null };
  }

  if (!(await isPlatformAdmin())) {
    return { error: "Not a platform admin." as const, supabase: null };
  }

  return { supabase, error: null };
}

function read(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function claimFirstAdminAction() {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return;
  }

  const { error } = await supabase.rpc("claim_first_platform_admin");

  if (error) {
    return;
  }

  redirect("/admin");
}

export async function createJurisdictionAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const code = read(formData, "code").toUpperCase();
  const name = read(formData, "name");

  if (!code || !name) return { error: "Code and name are required." };

  const { error } = await admin.supabase.from("jurisdictions").insert({ code, name });
  if (error) return { error: error.message };
  return { message: "Jurisdiction created." };
}

export async function createAuthorityAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const name = read(formData, "name");
  const jurisdictionId = Number(formData.get("jurisdiction_id"));

  if (!name || !Number.isInteger(jurisdictionId)) {
    return { error: "Jurisdiction and name are required." };
  }

  const { error } = await admin.supabase.from("authorities").insert({
    name,
    jurisdiction_id: jurisdictionId,
  });
  if (error) return { error: error.message };
  return { message: "Authority created." };
}

export async function createSpeciesAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const commonName = read(formData, "common_name");
  const scientificName = read(formData, "scientific_name");

  if (!commonName) return { error: "Common name is required." };

  const { error } = await admin.supabase.from("species").insert({
    common_name: commonName,
    scientific_name: scientificName || null,
  });
  if (error) return { error: error.message };
  return { message: "Species created." };
}

export async function createFisheryAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const name = read(formData, "name");
  const code = read(formData, "code");
  const authorityId = Number(formData.get("authority_id"));

  if (!name || !Number.isInteger(authorityId)) {
    return { error: "Authority and name are required." };
  }

  const { data, error } = await admin.supabase
    .from("fisheries")
    .insert({
      name,
      code: code || null,
      authority_id: authorityId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  redirect(`/admin/reference/fisheries/${data.id}`);
}

export async function createStockAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const fisheryId = Number(formData.get("fishery_id"));
  const speciesId = Number(formData.get("species_id"));
  const name = read(formData, "name");

  if (!Number.isInteger(fisheryId) || !Number.isInteger(speciesId) || !name) {
    return { error: "Species and stock name are required." };
  }

  const { error } = await admin.supabase.from("stocks").insert({
    fishery_id: fisheryId,
    species_id: speciesId,
    name,
  });
  if (error) return { error: error.message };
  return { message: "Stock created." };
}

export async function createSeasonAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const fisheryId = Number(formData.get("fishery_id"));
  const name = read(formData, "name");
  const startsOn = read(formData, "starts_on");
  const endsOn = read(formData, "ends_on");

  if (!Number.isInteger(fisheryId) || !name || !startsOn || !endsOn) {
    return { error: "Name and dates are required." };
  }

  const { error } = await admin.supabase.from("seasons").insert({
    fishery_id: fisheryId,
    name,
    starts_on: startsOn,
    ends_on: endsOn,
  });
  if (error) return { error: error.message };
  return { message: "Season created." };
}

export async function createQuotaTypeAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const fisheryId = Number(formData.get("fishery_id"));
  const name = read(formData, "name");
  const unitLabel = read(formData, "unit_label");
  const measurementKind = read(formData, "measurement_kind");

  if (!Number.isInteger(fisheryId) || !name || !unitLabel) {
    return { error: "Name, measurement kind and unit label are required." };
  }

  if (!MEASUREMENT_KINDS.includes(measurementKind as (typeof MEASUREMENT_KINDS)[number])) {
    return { error: "Choose WEIGHT, UNITS, EFFORT or OTHER." };
  }

  const { error } = await admin.supabase.from("quota_types").insert({
    fishery_id: fisheryId,
    name,
    unit_label: unitLabel,
    measurement_kind: measurementKind,
  });
  if (error) return { error: error.message };
  return { message: "Quota type created." };
}

export async function createFisheryRuleAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const fisheryId = Number(formData.get("fishery_id"));
  const code = read(formData, "code");
  const rawValue = read(formData, "value") || "true";

  if (!Number.isInteger(fisheryId) || !code) {
    return { error: "Rule code is required." };
  }

  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    value = rawValue;
  }

  const { error } = await admin.supabase.from("fishery_rules").insert({
    fishery_id: fisheryId,
    code,
    value,
  });
  if (error) return { error: error.message };
  return { message: "Rule created." };
}

export async function createHoldingAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const organisationId = Number(formData.get("organisation_id"));
  const stockId = Number(formData.get("stock_id"));
  const seasonId = Number(formData.get("season_id"));
  const quotaTypeId = Number(formData.get("quota_type_id"));
  const quantity = Number(read(formData, "quantity"));
  const note = read(formData, "note");

  if (
    !Number.isInteger(organisationId) ||
    !Number.isInteger(stockId) ||
    !Number.isInteger(seasonId) ||
    !Number.isInteger(quotaTypeId) ||
    !Number.isFinite(quantity)
  ) {
    return { error: "Organisation, stock, season, quota type and quantity are required." };
  }

  const { error } = await admin.supabase.rpc("create_quota_holding", {
    p_organisation_id: organisationId,
    p_stock_id: stockId,
    p_season_id: seasonId,
    p_quota_type_id: quotaTypeId,
    p_quantity: quantity,
    p_note: note || null,
  });

  if (error) return { error: error.message };
  return { message: "Holding created. Ledger recorded INITIAL_ALLOCATION." };
}
