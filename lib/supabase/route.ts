import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function createRequestClient(request: NextRequest) {
  const env = getSupabasePublicEnv();

  if (!env) {
    return null;
  }

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Read-only. Session cookies are written on the redirect response.
      },
    },
  });
}

export function createRouteClient(
  request: NextRequest,
  response: NextResponse,
) {
  const env = getSupabasePublicEnv();

  if (!env) {
    return null;
  }

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
