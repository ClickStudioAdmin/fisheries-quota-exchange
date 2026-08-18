import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

export const IMPERSONATING_COOKIE = "fqx_impersonating";
export const ADMIN_EMAIL_COOKIE = "fqx_admin_email";

const IMPERSONATION_MAX_AGE_SECONDS = 8 * 60 * 60;

export function impersonationCookiesAreSecure(
  env: NodeJS.ProcessEnv = process.env,
) {
  return env.NODE_ENV === "production" || Boolean(env.VERCEL);
}

export function impersonationCookieOptions(
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    httpOnly: true,
    secure: impersonationCookiesAreSecure(env),
    sameSite: "lax" as const,
    path: "/",
    maxAge: IMPERSONATION_MAX_AGE_SECONDS,
  };
}

type GenerateLinkProperties = {
  hashed_token?: unknown;
  email_otp?: unknown;
  action_link?: unknown;
  verification_type?: unknown;
};

function generateLinkProperties(data: unknown): GenerateLinkProperties | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as { properties?: unknown };
  if (record.properties && typeof record.properties === "object") {
    return record.properties as GenerateLinkProperties;
  }

  return record as GenerateLinkProperties;
}

export function hashedTokenFromGenerateLink(data: unknown) {
  const token = generateLinkProperties(data)?.hashed_token;

  return typeof token === "string" && token ? token : null;
}

export function emailOtpFromGenerateLink(data: unknown) {
  const token = generateLinkProperties(data)?.email_otp;

  return typeof token === "string" && token ? token : null;
}

export function tokenFromGenerateLink(data: unknown) {
  const actionLink = generateLinkProperties(data)?.action_link;

  if (typeof actionLink !== "string" || !actionLink) {
    return null;
  }

  try {
    return new URL(actionLink).searchParams.get("token");
  } catch {
    return null;
  }
}

export function verifyOtpTypeFromGenerateLink(data: unknown): EmailOtpType | null {
  const type = generateLinkProperties(data)?.verification_type;

  if (type === "signup" || type === "invite") {
    return null;
  }

  if (type === "magiclink" || type === "email" || type === "recovery") {
    return type;
  }

  return "magiclink";
}

export function authAccountReturned(data: unknown) {
  if (data == null) {
    return false;
  }

  if (Array.isArray(data)) {
    return data.length > 0;
  }

  return typeof data === "object";
}

export async function getImpersonationEmail() {
  const cookieStore = await cookies();
  const value = cookieStore.get(IMPERSONATING_COOKIE)?.value?.trim().toLowerCase();

  return value && value.includes("@") ? value : null;
}

export async function getImpersonatorAdminEmail() {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_EMAIL_COOKIE)?.value?.trim().toLowerCase();

  return value && value.includes("@") ? value : null;
}

export async function getActiveImpersonationEmail(userEmail?: string | null) {
  const impersonating = await getImpersonationEmail();
  const current = userEmail?.trim().toLowerCase() ?? "";

  if (!impersonating || !current || impersonating !== current) {
    return null;
  }

  return impersonating;
}

export async function clearImpersonationCookies() {
  const cookieStore = await cookies();
  const options = {
    ...impersonationCookieOptions(),
    maxAge: 0,
  };

  cookieStore.set(IMPERSONATING_COOKIE, "", options);
  cookieStore.set(ADMIN_EMAIL_COOKIE, "", options);
}

export function readImpersonationCookiesFrom(
  cookieList: { name: string; value: string }[],
) {
  const map = new Map(
    cookieList.map((cookie) => [cookie.name, cookie.value] as const),
  );
  const impersonating = map.get(IMPERSONATING_COOKIE)?.trim().toLowerCase() ?? "";
  const adminEmail = map.get(ADMIN_EMAIL_COOKIE)?.trim().toLowerCase() ?? "";

  return {
    impersonating: impersonating.includes("@") ? impersonating : null,
    adminEmail: adminEmail.includes("@") ? adminEmail : null,
  };
}
