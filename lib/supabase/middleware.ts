import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACTIVE_ORGANISATION_COOKIE,
  activeOrganisationCookieOptions,
  parseActiveOrganisationId,
  pathRequiresActiveOrganisation,
  resolveActiveOrganisation,
  selectAccountPath,
} from "@/lib/organisations/active-account";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function applyActiveOrganisationCookie(
  response: NextResponse,
  resolved: ReturnType<typeof resolveActiveOrganisation>,
) {
  const options = activeOrganisationCookieOptions();

  if (resolved.clearCookie) {
    response.cookies.set(ACTIVE_ORGANISATION_COOKIE, "", {
      ...options,
      maxAge: 0,
    });
  } else if (resolved.bindId != null) {
    response.cookies.set(
      ACTIVE_ORGANISATION_COOKIE,
      String(resolved.bindId),
      options,
    );
  }

  return response;
}

export async function updateSession(request: NextRequest) {
  const env = getSupabasePublicEnv();
  const pathname = request.nextUrl.pathname;
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/update-password") ||
    pathname.startsWith("/organisations") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/select-account") ||
    pathname.startsWith("/invitations");

  if (!env) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      const next = `${pathname}${request.nextUrl.search}`;
      url.pathname = "/login";
      url.search = "";
      if (!pathname.startsWith("/select-account")) {
        url.searchParams.set("next", next);
      }
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    const next = `${pathname}${request.nextUrl.search}`;
    url.pathname = "/login";
    url.search = "";
    if (!pathname.startsWith("/select-account")) {
      url.searchParams.set("next", next);
    }
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  if (user?.email && pathRequiresActiveOrganisation(pathname)) {
    const { data } = await supabase
      .from("organisation_users")
      .select("organisation_id")
      .eq("email", user.email.toLowerCase());
    const organisationIds = (data ?? [])
      .map((row) => Number(row.organisation_id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const cookieId = parseActiveOrganisationId(
      request.cookies.get(ACTIVE_ORGANISATION_COOKIE)?.value,
    );
    const resolved = resolveActiveOrganisation(organisationIds, cookieId);

    if (resolved.needsSelection) {
      const next = `${pathname}${request.nextUrl.search}`;
      const url = request.nextUrl.clone();
      const destination = new URL(selectAccountPath(next), request.nextUrl.origin);
      url.pathname = destination.pathname;
      url.search = destination.search;
      const redirectResponse = copyCookies(
        supabaseResponse,
        NextResponse.redirect(url),
      );
      return applyActiveOrganisationCookie(redirectResponse, resolved);
    }

    return applyActiveOrganisationCookie(supabaseResponse, resolved);
  }

  return supabaseResponse;
}
