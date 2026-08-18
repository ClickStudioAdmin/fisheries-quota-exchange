"use server";

import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  authAccountReturned,
  clearImpersonationCookies,
  getImpersonationEmail,
  hashedTokenFromGenerateLink,
  readStashedAdminSession,
  setImpersonationCookies,
} from "@/lib/admin/impersonate";
import { getAdminUserForAdmin } from "@/lib/organisations/admin-queries";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function failSwitch(): never {
  redirect("/admin/users?error=switch");
}

export async function switchToUserAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase) {
    failSwitch();
  }

  if (await getImpersonationEmail()) {
    redirect("/dashboard");
  }

  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const targetEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!targetEmail.includes("@")) {
    failSwitch();
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = user?.email?.trim().toLowerCase() ?? "";
  const accessToken = session?.access_token ?? "";
  const refreshToken = session?.refresh_token ?? "";

  if (!accessToken || !refreshToken || !adminEmail || adminEmail === targetEmail) {
    failSwitch();
  }

  if (!(await getAdminUserForAdmin(targetEmail))) {
    failSwitch();
  }

  const { data: person, error: personError } = await supabase.rpc(
    "admin_auth_person",
    { p_email: targetEmail },
  );

  if (personError || !authAccountReturned(person)) {
    failSwitch();
  }

  const service = createServiceClient();

  if (!service) {
    failSwitch();
  }

  const { data: linkData, error: linkError } =
    await service.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });
  const hashedToken = hashedTokenFromGenerateLink(linkData);

  if (linkError || !hashedToken) {
    failSwitch();
  }

  try {
    await setImpersonationCookies({
      email: targetEmail,
      accessToken,
      refreshToken,
    });
  } catch {
    failSwitch();
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: hashedToken,
  });

  if (otpError) {
    await clearImpersonationCookies();
    failSwitch();
  }

  redirect("/dashboard");
}

export async function stopImpersonationAction() {
  const supabase = await createClient();
  const stashed = await readStashedAdminSession();
  const impersonating = await getImpersonationEmail();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const currentEmail = user?.email?.trim().toLowerCase() ?? "";

  if (currentEmail && impersonating && currentEmail !== impersonating) {
    await clearImpersonationCookies();
    redirect("/dashboard");
  }

  if (!supabase || !stashed) {
    await clearImpersonationCookies();
    redirect("/admin/users");
  }

  const { error } = await supabase.auth.setSession({
    access_token: stashed.accessToken,
    refresh_token: stashed.refreshToken,
  });

  await clearImpersonationCookies();

  if (error) {
    redirect("/login?error=auth");
  }

  redirect("/admin/users");
}
