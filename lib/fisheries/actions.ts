"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  holdingVerifyPath,
  isQuantityType,
  parseHoldingIds,
} from "@/lib/fisheries/types";
import { getHolding, getFishery } from "@/lib/fisheries/queries";
import {
  notifyHoldingNeedsChanges,
  notifyHoldingPending,
  notifyHoldingVerified,
} from "@/lib/email/events";
import { userFacingError } from "@/lib/errors/user-message";
import { requireActiveOrganisationMatch } from "@/lib/organisations/active-session";
import {
  FISHERY_LOGO_BUCKET,
  fisheryLogoExtension,
  readLogoFile,
  validateFisheryLogo,
} from "@/lib/fisheries/logo";

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

type AdminClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

function revalidateFishery(id: number) {
  revalidatePath("/fisheries");
  revalidatePath(`/fisheries/${id}`);
  revalidatePath("/admin/reference/fisheries");
  revalidatePath(`/admin/reference/fisheries/${id}`);
}

async function storeFisheryLogo(
  supabase: AdminClient,
  fisheryId: number,
  file: File,
  previousPath: string | null,
) {
  const invalid = validateFisheryLogo(file);
  if (invalid) {
    return { error: invalid };
  }

  const ext = fisheryLogoExtension(file.type);
  if (!ext) {
    return { error: "Use a JPEG, PNG, WebP, or GIF image." };
  }

  const path = `${fisheryId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(FISHERY_LOGO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return { error: userFacingError(uploadError) };
  }

  const { error: updateError } = await supabase
    .from("fisheries")
    .update({ logo_path: path })
    .eq("id", fisheryId);

  if (updateError) {
    await supabase.storage.from(FISHERY_LOGO_BUCKET).remove([path]);
    return { error: userFacingError(updateError) };
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(FISHERY_LOGO_BUCKET).remove([previousPath]);
  }

  return { error: null };
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
  if (error) return { error: userFacingError(error) };
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

  const logo = readLogoFile(formData);
  if (logo) {
    const invalid = validateFisheryLogo(logo);
    if (invalid) {
      return { error: invalid };
    }
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

  if (error) return { error: userFacingError(error) };

  if (logo) {
    await storeFisheryLogo(admin.supabase, data.id, logo, null);
  }

  redirect(`/admin/reference/fisheries/${data.id}`);
}

export async function updateFisheryAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const fisheryId = Number(formData.get("fishery_id"));
  const name = read(formData, "name");
  const code = read(formData, "code");
  const jurisdictionId = Number(formData.get("jurisdiction_id"));
  const quantityType = read(formData, "quantity_type");

  if (!Number.isInteger(fisheryId) || !name || !Number.isInteger(jurisdictionId)) {
    return { error: "Title and jurisdiction are required." };
  }

  if (!isQuantityType(quantityType)) {
    return { error: "Choose Kg or Units." };
  }

  const { error } = await admin.supabase
    .from("fisheries")
    .update({
      name,
      code: code || null,
      jurisdiction_id: jurisdictionId,
      quantity_type: quantityType,
    })
    .eq("id", fisheryId);

  if (error) return { error: userFacingError(error) };

  const logo = readLogoFile(formData);
  if (logo) {
    const invalid = validateFisheryLogo(logo);
    if (invalid) {
      return { error: invalid };
    }

    const { data: current } = await admin.supabase
      .from("fisheries")
      .select("logo_path")
      .eq("id", fisheryId)
      .maybeSingle();

    const stored = await storeFisheryLogo(
      admin.supabase,
      fisheryId,
      logo,
      current?.logo_path ?? null,
    );

    if (stored.error) {
      return { error: stored.error };
    }
  }

  revalidateFishery(fisheryId);
  return { message: "Fishery saved." };
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

  if (!(await isPlatformAdmin())) {
    const activeError = await requireActiveOrganisationMatch(organisationId);

    if (activeError) {
      return { error: activeError };
    }
  }

  const { data, error } = await supabase.rpc("create_quota_holding", {
    p_organisation_id: organisationId,
    p_fishery_id: fisheryId,
    p_quantity: quantity,
    p_note: note || null,
  });

  if (error) return { error: userFacingError(error) };

  const holdingId = Number(data);
  if (Number.isInteger(holdingId)) {
    const holding = await getHolding(holdingId);
    if (holding?.verification_status === "PENDING_VERIFICATION") {
      await notifyHoldingPending(holdingId);
    } else if (holding?.verification_status === "VERIFIED") {
      const fishery = await getFishery(holding.fishery_id);
      await notifyHoldingVerified({
        organisationId: holding.organisation_id,
        fisheryName: fishery?.name ?? "Holding",
        holdingId: holding.id,
      });
    }
  }

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

  if (error) return { error: userFacingError(error) };

  revalidatePath("/dashboard/holdings");
  revalidatePath("/admin/holdings");
  revalidatePath(`/dashboard/holdings/${holdingId}`);
  revalidatePath(`/admin/holdings/${holdingId}`);
  return { message: "Holding updated. Ledger recorded ADJUSTMENT." };
}

export async function startHoldingVerifyAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const selected = parseHoldingIds(
    formData.getAll("ids").map(String).join(","),
  );

  if (selected.length === 0) {
    redirect("/admin/holdings");
  }

  const found = await Promise.all(selected.map(getHolding));

  if (
    found.some(
      (holding) =>
        holding == null || holding.verification_status !== "PENDING_VERIFICATION",
    )
  ) {
    redirect("/admin/holdings");
  }

  redirect(holdingVerifyPath(selected));
}

export async function verifyHoldingAction(formData: FormData) {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return;

  const holdingId = Number(formData.get("holding_id"));

  if (!Number.isInteger(holdingId)) {
    return;
  }

  const holding = await getHolding(holdingId);
  await admin.supabase.rpc("verify_quota_holding", {
    p_holding_id: holdingId,
  });

  if (holding) {
    const fishery = await getFishery(holding.fishery_id);
    await notifyHoldingVerified({
      organisationId: holding.organisation_id,
      fisheryName: fishery?.name ?? "Holding",
      holdingId: holding.id,
    });
  }

  revalidatePath("/admin/holdings");
  revalidatePath("/dashboard/holdings");
  revalidatePath(`/admin/holdings/${holdingId}`);
  revalidatePath(`/dashboard/holdings/${holdingId}`);
  revalidatePath("/admin/users", "layout");

  if (String(formData.get("from_queue") ?? "") === "1") {
    redirect(
      holdingVerifyPath(formData.getAll("review_queue").map(String)),
    );
  }
}

export async function requestHoldingChangesAction(formData: FormData) {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return;

  const holdingId = Number(formData.get("holding_id"));
  const note = String(formData.get("review_note") ?? "").trim();

  if (!Number.isInteger(holdingId) || !note) {
    return;
  }

  const holding = await getHolding(holdingId);

  if (!holding || holding.verification_status !== "PENDING_VERIFICATION") {
    return;
  }

  const fishery = await getFishery(holding.fishery_id);
  await notifyHoldingNeedsChanges({
    organisationId: holding.organisation_id,
    fisheryName: fishery?.name ?? "Holding",
    holdingId: holding.id,
    note,
  });

  revalidatePath("/admin/holdings");
  revalidatePath("/dashboard/holdings");
  revalidatePath(`/admin/holdings/${holdingId}`);
  revalidatePath(`/dashboard/holdings/${holdingId}`);
}

export async function updateFisheryLogoAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const fisheryId = Number(formData.get("fishery_id"));
  const logo = readLogoFile(formData);

  if (!Number.isInteger(fisheryId)) {
    return { error: "Fishery is required." };
  }

  if (!logo) {
    return { error: "Choose an image." };
  }

  const { data: fishery } = await admin.supabase
    .from("fisheries")
    .select("logo_path")
    .eq("id", fisheryId)
    .maybeSingle();

  if (!fishery) {
    return { error: "Fishery not found." };
  }

  const stored = await storeFisheryLogo(
    admin.supabase,
    fisheryId,
    logo,
    (fishery.logo_path as string | null) ?? null,
  );

  if (stored.error) {
    return { error: stored.error };
  }

  revalidateFishery(fisheryId);
  return { message: "Logo saved." };
}

export async function removeFisheryLogoAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.error || !admin.supabase) return { error: admin.error };

  const fisheryId = Number(formData.get("fishery_id"));

  if (!Number.isInteger(fisheryId)) {
    return { error: "Fishery is required." };
  }

  const { data: fishery } = await admin.supabase
    .from("fisheries")
    .select("logo_path")
    .eq("id", fisheryId)
    .maybeSingle();

  if (!fishery) {
    return { error: "Fishery not found." };
  }

  const { error } = await admin.supabase
    .from("fisheries")
    .update({ logo_path: null })
    .eq("id", fisheryId);

  if (error) {
    return { error: userFacingError(error) };
  }

  const previousPath = (fishery.logo_path as string | null) ?? null;
  if (previousPath) {
    await admin.supabase.storage.from(FISHERY_LOGO_BUCKET).remove([previousPath]);
  }

  revalidateFishery(fisheryId);
  return { message: "Logo removed." };
}
