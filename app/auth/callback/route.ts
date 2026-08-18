import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/admin/access";
import { postLoginPath } from "@/lib/auth/paths";
import { createClient, getUser } from "@/lib/supabase/server";
import { ensureOwnedAccount } from "@/lib/organisations/ensure-account";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

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

  const destination = postLoginPath(next, user ? await isPlatformAdmin() : false);

  return NextResponse.redirect(`${origin}${destination}`);
}
