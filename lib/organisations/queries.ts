import { createClient, getUser } from "@/lib/supabase/server";
import type {
  Organisation,
  OrganisationMember,
  OrganisationRole,
  OrganisationSummary,
} from "@/lib/organisations/types";
import { isOrganisationRole } from "@/lib/organisations/types";

export async function listMyOrganisations(): Promise<OrganisationSummary[]> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("organisation_users")
    .select("role, organisations ( id, legal_name, trading_name )")
    .eq("email", user.email.toLowerCase());

  if (error || !data) {
    return [];
  }

  const organisations: OrganisationSummary[] = [];

  for (const row of data) {
    const org = Array.isArray(row.organisations)
      ? row.organisations[0]
      : row.organisations;

    if (!org || !isOrganisationRole(row.role)) {
      continue;
    }

    organisations.push({
      id: org.id,
      legal_name: org.legal_name,
      trading_name: org.trading_name,
      role: row.role,
    });
  }

  return organisations;
}

export async function getOrganisation(
  id: number,
): Promise<{ organisation: Organisation; role: OrganisationRole } | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const role = await getMyRole(id);

  if (!role) {
    return null;
  }

  const { data, error } = await supabase
    .from("organisations")
    .select("id, legal_name, trading_name, abn, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { organisation: data as Organisation, role };
}

export async function listMembers(
  organisationId: number,
): Promise<OrganisationMember[]> {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("organisation_users")
    .select("id, organisation_id, email, role, created_at")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.filter((row) => isOrganisationRole(row.role)) as OrganisationMember[];
}

export async function getMyRole(
  organisationId: number,
): Promise<OrganisationRole | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("user_organisation_role", {
    org_id: organisationId,
  });

  if (error || typeof data !== "string" || !isOrganisationRole(data)) {
    return null;
  }

  return data;
}
