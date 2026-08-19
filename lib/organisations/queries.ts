import { cookies } from "next/headers";
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
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  ACTIVE_ORGANISATION_COOKIE,
  parseActiveOrganisationId,
} from "@/lib/organisations/active-account";
import {
  publicBuyerDisplay,
  publicSellerDisplay,
  type PublicIdentityDisplay,
  type PublicSellerDisplay,
} from "@/lib/organisations/public-seller";

function asIntegerId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isHideIdentity(value: unknown) {
  return value === true || value === "true" || value === "t";
}

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
      "id, legal_name, trading_name, abn, hide_identity, notification_roles, disabled_notification_emails, disabled_notification_in_app, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error?.message?.includes("hide_identity")) {
    const fallback = await supabase
      .from("organisations")
      .select(
        "id, legal_name, trading_name, abn, notification_roles, disabled_notification_emails, disabled_notification_in_app, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (fallback.error || !fallback.data) {
      return null;
    }

    return {
      organisation: {
        id: fallback.data.id,
        legal_name: fallback.data.legal_name,
        trading_name: fallback.data.trading_name,
        abn: fallback.data.abn,
        hide_identity: false,
        notification_roles: parseNotificationRoles(
          fallback.data.notification_roles,
        ),
        disabled_notification_emails: parseDisabledProductEmails(
          fallback.data.disabled_notification_emails,
        ),
        disabled_notification_in_app: parseDisabledProductEmails(
          fallback.data.disabled_notification_in_app,
        ),
        created_at: fallback.data.created_at,
        updated_at: fallback.data.updated_at,
      },
      role,
    };
  }

  if (error || !data) {
    return null;
  }

  return {
    organisation: {
      id: data.id,
      legal_name: data.legal_name,
      trading_name: data.trading_name,
      abn: data.abn,
      hide_identity: data.hide_identity === true,
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

export async function listOrganisationHideIdentity(
  organisationIds: number[],
): Promise<Map<number, boolean>> {
  const ids = [
    ...new Set(
      organisationIds
        .map((id) => asIntegerId(id))
        .filter((id): id is number => id != null),
    ),
  ];
  const hidden = new Map<number, boolean>();

  if (ids.length === 0) {
    return hidden;
  }

  const supabase = await createClient();

  if (!supabase) {
    return hidden;
  }

  try {
    const { data, error } = await supabase.rpc("organisations_hide_identity", {
      p_ids: ids,
    });

    if (error) {
      console.error("organisations_hide_identity failed", error.message);
      return hidden;
    }

    for (const row of (data ?? []) as {
      organisation_id?: unknown;
      hide_identity?: unknown;
    }[]) {
      const id = asIntegerId(row.organisation_id);
      if (id != null) {
        hidden.set(id, isHideIdentity(row.hide_identity));
      }
    }
  } catch (error) {
    console.error("organisations_hide_identity failed", error);
  }

  return hidden;
}

async function loadPublicIdentityDisplays(
  parties: readonly {
    id: number;
    organisation_id: number;
    name: string;
  }[],
  display: (input: {
    name: string;
    hideIdentity: boolean;
    viewerIsMember: boolean;
    isPlatformAdmin: boolean;
  }) => PublicIdentityDisplay,
): Promise<Record<number, PublicIdentityDisplay>> {
  const visible = (): Record<number, PublicIdentityDisplay> => {
    const displays: Record<number, PublicIdentityDisplay> = {};
    for (const party of parties) {
      const id = asIntegerId(party.id);
      if (id != null) {
        displays[id] = {
          label: party.name,
          tooltip: null,
        };
      }
    }
    return displays;
  };

  try {
    const organisationIds = parties
      .map((party) => asIntegerId(party.organisation_id))
      .filter((id): id is number => id != null);
    const store = await cookies();
    const activeId = parseActiveOrganisationId(
      store.get(ACTIVE_ORGANISATION_COOKIE)?.value,
    );
    const [hideMap, organisations, admin] = await Promise.all([
      listOrganisationHideIdentity(organisationIds),
      listMyOrganisations(),
      isPlatformAdmin(),
    ]);
    const activeBelongsToUser = organisations.some(
      (organisation) => asIntegerId(organisation.id) === activeId,
    );
    const displays: Record<number, PublicIdentityDisplay> = {};

    for (const party of parties) {
      const partyId = asIntegerId(party.id);
      const orgId = asIntegerId(party.organisation_id);
      if (partyId == null || orgId == null) {
        continue;
      }

      displays[partyId] = display({
        name: party.name,
        hideIdentity: hideMap.get(orgId) === true,
        viewerIsMember: activeBelongsToUser && activeId === orgId,
        isPlatformAdmin: admin,
      });
    }

    return displays;
  } catch (error) {
    console.error("loadPublicIdentityDisplays failed", error);
    return visible();
  }
}

export async function loadPublicSellerDisplays(
  listings: readonly {
    id: number;
    organisation_id: number;
    seller_name: string;
  }[],
): Promise<Record<number, PublicSellerDisplay>> {
  return loadPublicIdentityDisplays(
    listings.map((listing) => ({
      id: Number(listing.id),
      organisation_id: Number(listing.organisation_id),
      name: listing.seller_name,
    })),
    ({ name, hideIdentity, viewerIsMember, isPlatformAdmin }) =>
      publicSellerDisplay({
        sellerName: name,
        hideIdentity,
        viewerIsSellerMember: viewerIsMember,
        isPlatformAdmin,
      }),
  );
}

export async function loadPublicBuyerDisplays(
  bids: readonly {
    id: number;
    organisation_id: number;
    bidder_name: string;
  }[],
): Promise<Record<number, PublicIdentityDisplay>> {
  return loadPublicIdentityDisplays(
    bids.map((bid) => ({
      id: Number(bid.id),
      organisation_id: Number(bid.organisation_id),
      name: bid.bidder_name,
    })),
    ({ name, hideIdentity, viewerIsMember, isPlatformAdmin }) =>
      publicBuyerDisplay({
        buyerName: name,
        hideIdentity,
        viewerIsBuyerMember: viewerIsMember,
        isPlatformAdmin,
      }),
  );
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
