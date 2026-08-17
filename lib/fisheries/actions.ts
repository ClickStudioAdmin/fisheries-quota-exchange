"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient, getUser } from "@/lib/supabase/server";
import { MEASUREMENT_KINDS, isQuantityType } from "@/lib/fisheries/types";

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

export async function createFisheryAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const name = read(formData, "name");
  const code = read(formData, "code");
  const jurisdictionId = Number(formData.get("jurisdiction_id"));
  const quantityType = read(formData, "quantity_type");

  if (!name || !Number.isInteger(jurisdictionId)) {
    return { error: "Jurisdiction and name are required." };
  }

  if (!isQuantityType(quantityType)) {
    return { error: "Choose Kg or Units." };
  }

  const { data, error } = await admin.supabase
    .from("fisheries")
    .insert({
      name,
      code: code || null,
      jurisdiction_id: jurisdictionId,
      quantity_type: quantityType,
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
  const name = read(formData, "name");

  if (!Number.isInteger(fisheryId) || !name) {
    return { error: "Stock name is required." };
  }

  const { error } = await admin.supabase.from("stocks").insert({
    fishery_id: fisheryId,
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
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." };
  }

  const organisationId = Number(formData.get("organisation_id"));
  const fisheryId = Number(formData.get("fishery_id"));
  const quantity = Number(read(formData, "quantity"));
  const note = read(formData, "note");

  if (
    !Number.isInteger(organisationId) ||
    !Number.isInteger(fisheryId) ||
    !Number.isFinite(quantity)
  ) {
    return { error: "Organisation, fishery and quantity are required." };
  }

  const { error } = await supabase.rpc("create_quota_holding", {
    p_organisation_id: organisationId,
    p_fishery_id: fisheryId,
    p_quantity: quantity,
    p_note: note || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/holdings");
  revalidatePath("/admin/holdings");
  return { message: "Holding created. Ledger recorded INITIAL_ALLOCATION." };
}

export async function adjustHoldingAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." };
  }

  const holdingId = Number(formData.get("holding_id"));
  const quantity = Number(read(formData, "quantity"));
  const note = read(formData, "note");

  if (!Number.isInteger(holdingId) || !Number.isFinite(quantity)) {
    return { error: "Holding and quantity are required." };
  }

  const { error } = await supabase.rpc("adjust_quota_holding", {
    p_holding_id: holdingId,
    p_quantity: quantity,
    p_note: note || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/holdings");
  revalidatePath("/admin/holdings");
  return { message: "Holding updated. Ledger recorded ADJUSTMENT." };
}

export async function verifyHoldingAction(formData: FormData) {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return;

  const holdingId = Number(formData.get("holding_id"));

  if (!Number.isInteger(holdingId)) {
    return;
  }

  await admin.supabase.rpc("verify_quota_holding", {
    p_holding_id: holdingId,
  });

  revalidatePath("/admin/holdings");
  revalidatePath("/dashboard/holdings");
}
