"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient } from "@/lib/supabase/server";

export async function setUserVerifiedAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const verified = String(formData.get("verified") ?? "") === "true";

  if (!email.includes("@")) {
    return;
  }

  await supabase.rpc("set_user_verified", {
    p_email: email,
    p_verified: verified,
  });

  revalidatePath("/admin/users");
}