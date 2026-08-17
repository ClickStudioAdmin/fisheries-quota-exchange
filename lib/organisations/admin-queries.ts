import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  email: string;
  verified: boolean;
  accounts: string[];
};

export async function listOrganisationsForAdmin() {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("organisations")
    .select("id, legal_name")
    .order("legal_name");

  return (data ?? []) as { id: number; legal_name: string }[];
}

export async function listUsersForAdmin(): Promise<AdminUser[]> {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const [{ data: members }, { data: verified }] = await Promise.all([
    supabase
      .from("organisation_users")
      .select("email, organisations ( legal_name )")
      .order("email"),
    supabase.from("verified_users").select("email"),
  ]);

  const verifiedEmails = new Set(
    (verified ?? []).map((row) => row.email.toLowerCase()),
  );
  const users = new Map<string, AdminUser>();

  for (const row of members ?? []) {
    const email = String(row.email).toLowerCase();
    const organisation = Array.isArray(row.organisations)
      ? row.organisations[0]
      : row.organisations;
    const legalName =
      organisation && typeof organisation === "object" && "legal_name" in organisation
        ? String(organisation.legal_name ?? "")
        : "";
    const existing: AdminUser = users.get(email) ?? {
      email,
      verified: verifiedEmails.has(email),
      accounts: [],
    };

    if (legalName && !existing.accounts.includes(legalName)) {
      existing.accounts.push(legalName);
    }

    users.set(email, existing);
  }

  return [...users.values()].sort((a, b) => a.email.localeCompare(b.email));
}
