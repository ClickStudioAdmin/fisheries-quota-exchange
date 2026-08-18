import { type NextRequest } from "next/server";
import { readImpersonationCookiesFrom } from "@/lib/admin/impersonate";
import {
  adminEmailExists,
  clearImpersonationCookiesOnResponse,
  impersonationRedirect,
  isSameOriginPost,
  signInAsOnResponse,
} from "@/lib/admin/impersonate-session";
import { createRequestClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) {
    return impersonationRedirect(request, "/login?error=auth");
  }

  const { impersonating, adminEmail } = readImpersonationCookiesFrom(
    request.cookies.getAll(),
  );
  const supabase = createRequestClient(request);
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const currentEmail = user?.email?.trim().toLowerCase() ?? "";

  if (!impersonating || !adminEmail || currentEmail !== impersonating) {
    const response = impersonationRedirect(request, "/admin/users");
    clearImpersonationCookiesOnResponse(response);
    return response;
  }

  if (!(await adminEmailExists(adminEmail))) {
    const response = impersonationRedirect(request, "/login?error=auth");
    clearImpersonationCookiesOnResponse(response);
    return response;
  }

  const response = impersonationRedirect(request, "/admin/users");
  const signedIn = await signInAsOnResponse({
    request,
    response,
    email: adminEmail,
  });

  clearImpersonationCookiesOnResponse(response);

  if (signedIn.error || signedIn.userEmail !== adminEmail) {
    return impersonationRedirect(request, "/dashboard");
  }

  return response;
}
