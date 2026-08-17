"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/admin/access";
import { adminUserPath } from "@/lib/organisations/paths";
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
  revalidatePath(adminUserPath(email));
}

export async function deleteUsersAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const emails = [
    ...new Set(
      formData
        .getAll("emails")
        .map((value) => String(value).trim().toLowerCase())
        .filter((email) => email.includes("@")),
    ),
  ];

  if (emails.length === 0) {
    return;
  }

  const { error } = await supabase.rpc("admin_delete_users", {
    p_emails: emails,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/admin/users", "layout");
}