import { createClient } from "@/lib/supabase/server";

export async function isPlatformAdmin() {
  const supabase = await createClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc("is_platform_admin");

  return !error && data === true;
}

export async function platformAdminCount() {
  const supabase = await createClient();

  if (!supabase) {
    return 0;
  }

  const { data, error } = await supabase.rpc("platform_admin_count");

  if (error || typeof data !== "number") {
    return 0;
  }

  return data;
}

export async function canSeeAdmin() {
  const count = await platformAdminCount();

  if (count === 0) {
    return true;
  }

  return isPlatformAdmin();
}
