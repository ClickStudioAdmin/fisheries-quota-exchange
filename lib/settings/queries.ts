import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PLATFORM_SETTINGS,
  type PlatformSettings,
} from "@/lib/settings/types";

function asSettings(row: Record<string, unknown> | null): PlatformSettings {
  if (!row) {
    return DEFAULT_PLATFORM_SETTINGS;
  }

  return {
    sale_fee_percent: String(row.sale_fee_percent ?? "0"),
    lease_fee_percent: String(row.lease_fee_percent ?? "0"),
    allow_registrations: row.allow_registrations !== false,
    auto_approve_holdings: row.auto_approve_holdings !== false,
    auto_approve_listings: row.auto_approve_listings === true,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const supabase = await createClient();

  if (!supabase) {
    return DEFAULT_PLATFORM_SETTINGS;
  }

  const { data, error } = await supabase
    .from("platform_settings")
    .select(
      "sale_fee_percent, lease_fee_percent, allow_registrations, auto_approve_holdings, auto_approve_listings",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("getPlatformSettings failed", error.message);
    return DEFAULT_PLATFORM_SETTINGS;
  }

  return asSettings(data);
}

export async function registrationsAllowed() {
  const supabase = await createClient();

  if (!supabase) {
    return true;
  }

  const { data, error } = await supabase.rpc("registrations_allowed");

  if (error) {
    console.error("registrations_allowed failed", error.message);
    return true;
  }

  return data === true;
}

export async function isVerifiedUser() {
  const supabase = await createClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc("is_verified_user");

  return !error && data === true;
}
