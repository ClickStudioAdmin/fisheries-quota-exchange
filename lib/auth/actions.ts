"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

export async function registerAction(
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

  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
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

  redirect("/dashboard");
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

export async function logoutAction() {
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/");
}
