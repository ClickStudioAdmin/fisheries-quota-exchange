"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/admin/access";
import { adminUserPath } from "@/lib/organisations/paths";
import { createClient } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/errors/user-message";

function readEmails(formData: FormData, fieldName = "emails") {
  return [
    ...new Set(
      formData
        .getAll(fieldName)
        .map((value) => String(value).trim().toLowerCase())
        .filter((email) => email.includes("@")),
    ),
  ];
}

async function applyUserVerified(emails: string[], verified: boolean) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin()) || emails.length === 0) {
    return;
  }

  for (const email of emails) {
    const { error } = await supabase.rpc("set_user_verified", {
      p_email: email,
      p_verified: verified,
    });

    if (error) {
      throw new Error(userFacingError(error));
    }

    revalidatePath(adminUserPath(email));
  }

  revalidatePath("/admin/users");
}

export async function setUserVerifiedAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const verified = String(formData.get("verified") ?? "") === "true";

  if (!email.includes("@")) {
    return;
  }

  await applyUserVerified([email], verified);
}

export async function setUsersVerifiedAction(formData: FormData) {
  const verified = String(formData.get("verified") ?? "") === "true";

  await applyUserVerified(readEmails(formData), verified);
}

export async function deleteUsersAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const emails = readEmails(formData);

  if (emails.length === 0) {
    return;
  }

  const { error } = await supabase.rpc("admin_delete_users", {
    p_emails: emails,
  });

  if (error) {
    throw new Error(userFacingError(error));
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/admin/users", "layout");
}
