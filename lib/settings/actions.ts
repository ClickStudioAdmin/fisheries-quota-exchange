"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/errors/user-message";

export type SettingsFormState = {
  error?: string;
  message?: string;
};

function readPercent(formData: FormData, name: string, label: string) {
  const raw = String(formData.get(name) ?? "").trim();
  const value = Number(raw);

  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { error: `${label} must be between 0 and 100.` } as const;
  }

  return { value } as const;
}

function readToggle(formData: FormData, name: string) {
  return String(formData.get(name) ?? "") === "on";
}

export async function updatePlatformSettingsAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  if (!(await isPlatformAdmin())) {
    return { error: "Not a platform admin." };
  }

  const sale = readPercent(formData, "sale_fee_percent", "Sale fee");
  const lease = readPercent(formData, "lease_fee_percent", "Lease fee");

  if ("error" in sale) {
    return { error: sale.error };
  }

  if ("error" in lease) {
    return { error: lease.error };
  }

  const supabase = await createClient();

  if (!supabase) {
    return { error: "Database is not configured." };
  }

  const { error } = await supabase.rpc("update_platform_settings", {
    p_sale_fee_percent: sale.value,
    p_lease_fee_percent: lease.value,
    p_allow_registrations: readToggle(formData, "allow_registrations"),
    p_auto_approve_holdings: readToggle(formData, "auto_approve_holdings"),
    p_auto_approve_listings: readToggle(formData, "auto_approve_listings"),
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/register");
  revalidatePath("/login");

  return { message: "Settings saved." };
}
