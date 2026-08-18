import { cookies } from "next/headers";

export const IMPERSONATING_COOKIE = "fqx_impersonating";
export const ADMIN_ACCESS_COOKIE = "fqx_admin_access";
export const ADMIN_REFRESH_COOKIE = "fqx_admin_refresh";

const IMPERSONATION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type StashedAdminSession = {
  accessToken: string;
  refreshToken: string;
};

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

export function hashedTokenFromGenerateLink(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as { properties?: unknown; hashed_token?: unknown };
  const properties =
    record.properties && typeof record.properties === "object"
      ? (record.properties as { hashed_token?: unknown })
      : record;
  const token = properties.hashed_token;

  return typeof token === "string" && token ? token : null;
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

export async function getActiveImpersonationEmail(userEmail?: string | null) {
  const impersonating = await getImpersonationEmail();
  const current = userEmail?.trim().toLowerCase() ?? "";

  if (!impersonating || !current || impersonating !== current) {
    return null;
  }

  return impersonating;
}

export async function readStashedAdminSession(): Promise<StashedAdminSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  const refreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE)?.value ?? "";

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export async function setImpersonationCookies(input: {
  email: string;
  accessToken: string;
  refreshToken: string;
}) {
  const cookieStore = await cookies();
  const options = impersonationCookieOptions();

  cookieStore.set(IMPERSONATING_COOKIE, input.email, options);
  cookieStore.set(ADMIN_ACCESS_COOKIE, input.accessToken, options);
  cookieStore.set(ADMIN_REFRESH_COOKIE, input.refreshToken, options);
}

export async function clearImpersonationCookies() {
  const cookieStore = await cookies();
  const options = {
    ...impersonationCookieOptions(),
    maxAge: 0,
  };

  cookieStore.set(IMPERSONATING_COOKIE, "", options);
  cookieStore.set(ADMIN_ACCESS_COOKIE, "", options);
  cookieStore.set(ADMIN_REFRESH_COOKIE, "", options);
}
