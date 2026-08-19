import { createClient, getUser } from "@/lib/supabase/server";
import type {
  Organisation,
  OrganisationInvitation,
  OrganisationMember,
  OrganisationRole,
  OrganisationSummary,
} from "@/lib/organisations/types";
import { isOrganisationRole } from "@/lib/organisations/types";
import { parseNotificationRoles } from "@/lib/organisations/notification-roles";
import { parseDisabledProductEmails } from "@/lib/email/product-emails";
import { isInvitationToken } from "@/lib/organisations/paths";

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

export async function getOrganisationLegalName(id: number) {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("organisations")
    .select("legal_name")
    .eq("id", id)
    .maybeSingle();

  if (error || !data?.legal_name) {
    return null;
  }

  return String(data.legal_name);
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
    .select(
      "id, legal_name, trading_name, abn, notification_roles, disabled_notification_emails, disabled_notification_in_app, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    organisation: {
      id: data.id,
      legal_name: data.legal_name,
      trading_name: data.trading_name,
      abn: data.abn,
      notification_roles: parseNotificationRoles(data.notification_roles),
      disabled_notification_emails: parseDisabledProductEmails(
        data.disabled_notification_emails,
      ),
      disabled_notification_in_app: parseDisabledProductEmails(
        data.disabled_notification_in_app,
      ),
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
    role,
  };
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
    .select("id, organisation_id, email, full_name, role, created_at")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.filter((row) => isOrganisationRole(row.role)) as OrganisationMember[];
}

function asInvitation(row: {
  id: number;
  organisation_id: number;
  organisation_name: string;
  email: string;
  role: string;
  invited_by_email: string;
  created_at: string;
  expires_at: string;
  token?: string | null;
}): OrganisationInvitation | null {
  if (!isOrganisationRole(row.role)) {
    return null;
  }

  return {
    id: row.id,
    organisation_id: row.organisation_id,
    organisation_name: row.organisation_name,
    email: row.email,
    role: row.role,
    invited_by_email: row.invited_by_email,
    created_at: row.created_at,
    expires_at: row.expires_at,
    token: row.token ?? "",
  };
}

export async function listOrganisationInvitations(
  organisationId: number,
): Promise<OrganisationInvitation[]> {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("organisation_invitations")
    .select(
      "id, organisation_id, organisation_name, email, role, invited_by_email, created_at, expires_at",
    )
    .eq("organisation_id", organisationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => asInvitation({ ...row, token: "" }))
    .filter((row): row is OrganisationInvitation => row != null);
}

export async function listMyPendingInvitations(): Promise<OrganisationInvitation[]> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("organisation_invitations")
    .select(
      "id, organisation_id, organisation_name, email, role, invited_by_email, created_at, expires_at, token",
    )
    .eq("email", user.email.toLowerCase())
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => asInvitation(row))
    .filter((row): row is OrganisationInvitation => row != null);
}

export type OrganisationInvitationDetails = {
  id: number;
  organisation_id: number;
  organisation_name: string;
  email: string;
  role: OrganisationRole;
  expires_at: string;
  accepted_at: string | null;
};

export async function getInvitationByToken(
  token: string,
): Promise<OrganisationInvitationDetails | null> {
  const supabase = await createClient();

  if (!supabase || !isInvitationToken(token)) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_organisation_invitation", {
    p_token: token.trim(),
  });

  if (error || !data) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || !isOrganisationRole(row.role)) {
    return null;
  }

  return {
    id: Number(row.id),
    organisation_id: Number(row.organisation_id),
    organisation_name: String(row.organisation_name),
    email: String(row.email),
    role: row.role,
    expires_at: String(row.expires_at),
    accepted_at: row.accepted_at ? String(row.accepted_at) : null,
  };
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
