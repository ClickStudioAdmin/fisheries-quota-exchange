import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { ensureOwnedAccount } from "@/lib/organisations/ensure-account";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const user = await getUser();

  if (user) {
    await ensureOwnedAccount(supabase, user);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
