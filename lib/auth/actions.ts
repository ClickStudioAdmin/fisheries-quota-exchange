"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { continueAfterAuthentication } from "@/lib/organisations/active-session";
import { clearActiveOrganisationCookie } from "@/lib/organisations/active-session";
import { userFacingError } from "@/lib/errors/user-message";
import { getSiteUrl } from "@/lib/site-url";
import { ensureOwnedAccount } from "@/lib/organisations/ensure-account";
import { safeNextPath } from "@/lib/auth/paths";
import type { AuthFormState } from "@/lib/auth/types";

function readEmailPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." } as const;
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." } as const;
  }

  return { email, password } as const;
}

function readPhone(value: string) {
  const phone = value.trim();

  if (!phone) {
    return { error: "Enter a phone number." } as const;
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length < 8) {
    return { error: "Enter a valid phone number." } as const;
  }

  return { phone } as const;
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = readEmailPassword(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phoneResult = readPhone(String(formData.get("phone") ?? ""));

  if (!fullName) {
    return { error: "Enter your name." };
  }

  if ("error" in phoneResult) {
    return { error: phoneResult.error };
  }

  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured for this environment." };
  }

  const { data: allowed, error: allowedError } = await supabase.rpc(
    "registrations_allowed",
  );

  if (allowedError) {
    return { error: userFacingError(allowedError) };
  }

  if (allowed !== true) {
    return { error: "New registrations are closed." };
  }

  const siteUrl = await getSiteUrl();
  const rawNext = String(formData.get("next") ?? "").trim();
  const next = rawNext ? safeNextPath(rawNext) : null;
  const callback = siteUrl
    ? next
      ? `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`
      : `${siteUrl}/auth/callback`
    : undefined;
  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: callback,
      data: {
        full_name: fullName,
        phone: phoneResult.phone,
      },
    },
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  if (!data.session) {
    return {
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  if (data.user) {
    await ensureOwnedAccount(supabase, data.user);
  }

  redirect(await continueAfterAuthentication(next));
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = readEmailPassword(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured for this environment." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureOwnedAccount(supabase, user);
  }

  redirect(await continueAfterAuthentication(String(formData.get("next") ?? "")));
}

export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured for this environment." };
  }

  const siteUrl = await getSiteUrl();

  if (!siteUrl) {
    return { error: "Could not determine the site URL for the reset email." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  return {
    message: "If that email is registered, a reset link has been sent.",
  };
}

export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured for this environment." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: userFacingError(error) };
  }

  redirect(await continueAfterAuthentication());
}

export async function updatePersonAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phoneResult = readPhone(String(formData.get("phone") ?? ""));

  if (!fullName) {
    return { error: "Enter your name." };
  }

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  if ("error" in phoneResult) {
    return { error: phoneResult.error };
  }

  const currentEmail = user.email?.toLowerCase() ?? "";
  const siteUrl = await getSiteUrl();
  const attributes: {
    email?: string;
    data: { full_name: string; phone: string };
  } = {
    data: {
      full_name: fullName,
      phone: phoneResult.phone,
    },
  };

  if (email !== currentEmail) {
    attributes.email = email;
  }

  const { data, error } = await supabase.auth.updateUser(
    attributes,
    siteUrl && attributes.email
      ? { emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard` }
      : undefined,
  );

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  if (attributes.email && data.user?.email?.toLowerCase() !== email) {
    return {
      message:
        "Saved. Check your new email address to confirm the email change.",
    };
  }

  return { message: "Profile saved." };
}

export async function updateProfilePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return { error: "You must be signed in." };
  }

  const currentPassword = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!currentPassword) {
    return { error: "Enter your current password." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirm) {
    return { error: "New password and confirmation do not match." };
  }

  const { error: currentError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (currentError) {
    return { error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: userFacingError(error) };
  }

  return { message: "Password updated." };
}

export async function logoutAction() {
  await clearActiveOrganisationCookie();
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/");
}
