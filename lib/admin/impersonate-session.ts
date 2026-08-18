import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  ADMIN_EMAIL_COOKIE,
  IMPERSONATING_COOKIE,
  emailOtpFromGenerateLink,
  hashedTokenFromGenerateLink,
  impersonationCookieOptions,
  tokenFromGenerateLink,
  verifyOtpTypeFromGenerateLink,
} from "@/lib/admin/impersonate";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceClient } from "@/lib/supabase/service";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  return Boolean(origin && origin === request.nextUrl.origin);
}

export function impersonationRedirect(
  request: NextRequest,
  path: string,
) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export function isSameOriginPost(request: NextRequest) {
  return request.method === "POST" && sameOrigin(request);
}

export async function generateUserMagicLink(email: string, redirectTo: string) {
  const service = createServiceClient();

  if (!service) {
    return { data: null, error: new Error("Missing service role key.") };
  }

  return service.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
}

export async function verifyGeneratedMagicLink(
  supabase: SupabaseClient,
  email: string,
  linkData: unknown,
) {
  const otpType: EmailOtpType | null = verifyOtpTypeFromGenerateLink(linkData);

  if (!otpType) {
    return {
      data: { user: null, session: null },
      error: new Error("That email does not have a login account."),
    };
  }

  const hashedToken = hashedTokenFromGenerateLink(linkData);
  const emailOtp = emailOtpFromGenerateLink(linkData);
  const token = tokenFromGenerateLink(linkData);

  if (hashedToken) {
    const hashed = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: hashedToken,
    });

    if (!hashed.error && hashed.data.session?.user) {
      return hashed;
    }
  }

  if (emailOtp) {
    const otp = await supabase.auth.verifyOtp({
      email,
      token: emailOtp,
      type: otpType,
    });

    if (!otp.error && otp.data.session?.user) {
      return otp;
    }
  }

  if (token) {
    return supabase.auth.verifyOtp({
      email,
      token,
      type: otpType,
    });
  }

  return {
    data: { user: null, session: null },
    error: new Error("Could not create a session for that user."),
  };
}

export async function signInAsOnResponse(input: {
  request: NextRequest;
  response: NextResponse;
  email: string;
}) {
  const supabase = createRouteClient(input.request, input.response);

  if (!supabase) {
    return { error: "Missing Supabase configuration.", userEmail: null };
  }

  const { data: linkData, error: linkError } = await generateUserMagicLink(
    input.email,
    `${input.request.nextUrl.origin}/dashboard`,
  );

  if (linkError || !linkData) {
    return { error: linkError?.message ?? "Could not create a login link.", userEmail: null };
  }

  await supabase.auth.signOut({ scope: "local" });

  const verified = await verifyGeneratedMagicLink(
    supabase,
    input.email,
    linkData,
  );
  const userEmail = verified.data.session?.user.email?.trim().toLowerCase() ?? "";

  if (verified.error || userEmail !== input.email) {
    return {
      error: verified.error?.message ?? "Could not sign in as that user.",
      userEmail: null,
    };
  }

  return { error: null, userEmail };
}

export function setImpersonationCookiesOnResponse(
  response: NextResponse,
  input: { impersonating: string; adminEmail: string },
) {
  const options = impersonationCookieOptions();

  response.cookies.set(IMPERSONATING_COOKIE, input.impersonating, options);
  response.cookies.set(ADMIN_EMAIL_COOKIE, input.adminEmail, options);
}

export function clearImpersonationCookiesOnResponse(response: NextResponse) {
  const options = {
    ...impersonationCookieOptions(),
    maxAge: 0,
  };

  response.cookies.set(IMPERSONATING_COOKIE, "", options);
  response.cookies.set(ADMIN_EMAIL_COOKIE, "", options);
}

export async function adminEmailExists(email: string) {
  const service = createServiceClient();

  if (!service) {
    return false;
  }

  const { data, error } = await service
    .from("platform_admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  return !error && Boolean(data?.email);
}
