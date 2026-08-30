import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type Supabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;

function readMeta(user: User, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function ensureOwnedAccount(supabase: Supabase, user: User) {
  const legalName = readMeta(user, "pending_legal_name");

  if (!legalName || !user.email) {
    return;
  }

  const { data } = await supabase
    .from("organisation_users")
    .select("role")
    .eq("email", user.email.toLowerCase());

  if (data?.some((row) => row.role === "OWNER")) {
    await supabase.auth.updateUser({
      data: {
        pending_legal_name: null,
        pending_trading_name: null,
        pending_abn: null,
      },
    });
    return;
  }

  const { error } = await supabase.rpc("create_organisation", {
    p_legal_name: legalName,
    p_trading_name: readMeta(user, "pending_trading_name") || null,
    p_abn: readMeta(user, "pending_abn") || null,
  });

  if (error) {
    return;
  }

  await supabase.auth.updateUser({
    data: {
      pending_legal_name: null,
      pending_trading_name: null,
      pending_abn: null,
    },
  });
}
