"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/paths";
import { ensureOwnedAccount } from "@/lib/organisations/ensure-account";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import { getMyRole } from "@/lib/organisations/queries";
import type { AuthFormState } from "@/lib/auth/types";

async function getSiteUrl() {
  const headerList = await headers();
  const origin = headerList.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return null;
  }

  return `${protocol}://${host}`;
}

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

function readAbn(value: string) {
  const abn = value.replace(/\s/g, "");

  if (!abn) {
    return { abn: null } as const;
  }

  if (!/^\d{11}$/.test(abn)) {
    return { error: "ABN must be 11 digits if provided." } as const;
  }

  return { abn } as const;
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
  const legalName = String(formData.get("legal_name") ?? "").trim();
  const tradingName = String(formData.get("trading_name") ?? "").trim();
  const abnResult = readAbn(String(formData.get("abn") ?? "").trim());

  if (!fullName) {
    return { error: "Enter your name." };
  }

  if ("error" in phoneResult) {
    return { error: phoneResult.error };
  }

  if (!legalName) {
    return { error: "Legal name is required." };
  }

  if ("error" in abnResult) {
    return { error: abnResult.error };
  }

  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured for this environment." };
  }

  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
      data: {
        full_name: fullName,
        phone: phoneResult.phone,
        pending_legal_name: legalName,
        pending_trading_name: tradingName,
        pending_abn: abnResult.abn,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  if (data.user) {
    await ensureOwnedAccount(supabase, data.user);
  }

  redirect("/dashboard");
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
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureOwnedAccount(supabase, user);
  }

  redirect(safeNextPath(String(formData.get("next") ?? "")));
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
    return { error: error.message };
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
    return { error: error.message };
  }

  redirect("/dashboard");
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

  const organisationId = Number(formData.get("organisation_id"));
  let organisationUpdate: {
    legal_name: string;
    trading_name: string | null;
    abn: string | null;
  } | null = null;

  if (Number.isInteger(organisationId) && organisationId > 0) {
    const role = await getMyRole(organisationId);

    if (role && canEditOrganisation(role)) {
      const legalName = String(formData.get("legal_name") ?? "").trim();
      const tradingName = String(formData.get("trading_name") ?? "").trim();
      const abnResult = readAbn(String(formData.get("abn") ?? "").trim());

      if (!legalName) {
        return { error: "Legal name is required." };
      }

      if ("error" in abnResult) {
        return { error: abnResult.error };
      }

      organisationUpdate = {
        legal_name: legalName,
        trading_name: tradingName || null,
        abn: abnResult.abn,
      };
    }
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
    return { error: error.message };
  }

  if (organisationUpdate) {
    const { error: organisationError } = await supabase
      .from("organisations")
      .update(organisationUpdate)
      .eq("id", organisationId);

    if (organisationError) {
      return { error: organisationError.message };
    }
  }

  revalidatePath("/dashboard");

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
    return { error: error.message };
  }

  return { message: "Password updated." };
}

export async function logoutAction() {
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/");
}
