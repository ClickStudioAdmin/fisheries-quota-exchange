import { type NextRequest } from "next/server";
import {
  adminEmailExists,
  impersonationRedirect,
  isSameOriginPost,
  setImpersonationCookiesOnResponse,
  signInAsOnResponse,
} from "@/lib/admin/impersonate-session";
import { readImpersonationCookiesFrom } from "@/lib/admin/impersonate";
import { getAdminUserForAdmin } from "@/lib/organisations/admin-queries";
import { createRequestClient } from "@/lib/supabase/route";

function fail(request: NextRequest) {
  return impersonationRedirect(request, "/admin/users?error=switch");
}

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) {
    return fail(request);
  }

  const existing = readImpersonationCookiesFrom(request.cookies.getAll());

  if (existing.impersonating) {
    return impersonationRedirect(request, "/dashboard");
  }

  const supabase = createRequestClient(request);

  if (!supabase) {
    return fail(request);
  }

  const { data: admin, error: adminError } = await supabase.rpc(
    "is_platform_admin",
  );

  if (adminError || admin !== true) {
    return impersonationRedirect(request, "/admin");
  }

  const formData = await request.formData();
  const targetEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!targetEmail.includes("@")) {
    return fail(request);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = user?.email?.trim().toLowerCase() ?? "";

  if (!adminEmail || adminEmail === targetEmail) {
    return fail(request);
  }

  if (!(await adminEmailExists(adminEmail))) {
    return fail(request);
  }

  if (!(await getAdminUserForAdmin(targetEmail))) {
    return fail(request);
  }

  const response = impersonationRedirect(request, "/dashboard");
  const signedIn = await signInAsOnResponse({
    request,
    response,
    email: targetEmail,
  });

  if (signedIn.error || signedIn.userEmail !== targetEmail) {
    return fail(request);
  }

  setImpersonationCookiesOnResponse(response, {
    impersonating: targetEmail,
    adminEmail,
  });

  return response;
}
