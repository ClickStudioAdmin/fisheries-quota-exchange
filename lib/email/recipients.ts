import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function db() {
  return createServiceClient() ?? (await createClient());
}

export async function organisationManagerEmails(organisationId: number) {
  const supabase = await db();

  if (!supabase || !Number.isInteger(organisationId)) {
    return [];
  }

  const { data } = await supabase
    .from("organisation_users")
    .select("email, role")
    .eq("organisation_id", organisationId)
    .in("role", ["OWNER", "ADMIN"]);

  return uniqueEmails(
    (data ?? []).map((row) => String(row.email ?? "")),
  );
}

export async function platformAdminEmails() {
  const supabase = await db();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase.from("platform_admins").select("email");

  return uniqueEmails(
    (data ?? []).map((row) => String(row.email ?? "")),
  );
}

export function uniqueEmails(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values
        .map((value) => value?.trim().toLowerCase() ?? "")
        .filter((value) => value.includes("@")),
    ),
  ];
}
