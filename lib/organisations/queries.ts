import { createClient, getUser } from "@/lib/supabase/server";
import type {
  EntityKind,
  Organisation,
  OrganisationInvitation,
  OrganisationJurisdictionProfile,
  OrganisationMember,
  OrganisationRole,
  OrganisationSummary,
} from "@/lib/organisations/types";
import { isEntityKind, isOrganisationRole } from "@/lib/organisations/types";
import { parseNotificationRoles } from "@/lib/organisations/notification-roles";
import { parseAustralianAddress } from "@/lib/organisations/address";
import { parseEnabledJurisdictionCodes } from "@/lib/organisations/enabled-jurisdictions";
import { parseDisabledProductEmails } from "@/lib/email/product-emails";
import { isInvitationToken } from "@/lib/organisations/paths";
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  parseOrganisationHideIdentityRows,
  publicBuyerDisplay,
  publicSellerDisplay,
  type PublicIdentityDisplay,
  type PublicSellerDisplay,
} from "@/lib/organisations/public-seller";

function asIntegerId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function asNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asEntityKind(value: unknown): EntityKind | null {
  return typeof value === "string" && isEntityKind(value) ? value : null;
}

const ORGANISATION_COLUMNS =
  "id, legal_name, trading_name, abn, hide_identity, notification_roles, disabled_notification_emails, disabled_notification_in_app, created_at, updated_at, entity_kind, acn, mobile, registered_address, postal_address, postal_same_as_registered, enabled_jurisdiction_codes";

const JURISDICTION_PROFILE_COLUMNS =
  "organisation_id, jurisdiction_id, client_reference, licence_number, fishery_symbols";

type OrganisationDbClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

function mapOrganisation(row: Record<string, unknown>): Organisation {
  return {
    id: Number(row.id),
    legal_name: String(row.legal_name),
    trading_name: asNullableText(row.trading_name),
    abn: asNullableText(row.abn),
    hide_identity: row.hide_identity === true,
    notification_roles: parseNotificationRoles(row.notification_roles),
    disabled_notification_emails: parseDisabledProductEmails(
      row.disabled_notification_emails,
    ),
    disabled_notification_in_app: parseDisabledProductEmails(
      row.disabled_notification_in_app,
    ),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    entity_kind: asEntityKind(row.entity_kind),
    acn: asNullableText(row.acn),
    mobile: asNullableText(row.mobile),
    registered_address: parseAustralianAddress(row.registered_address),
    postal_address: parseAustralianAddress(row.postal_address),
    postal_same_as_registered: row.postal_same_as_registered !== false,
    enabled_jurisdiction_codes: parseEnabledJurisdictionCodes(
      row.enabled_jurisdiction_codes,
    ),
  };
}

function mapJurisdictionProfile(
  row: Record<string, unknown>,
): OrganisationJurisdictionProfile {
  return {
    organisation_id: Number(row.organisation_id),
    jurisdiction_id: Number(row.jurisdiction_id),
    client_reference: asNullableText(row.client_reference),
    licence_number: asNullableText(row.licence_number),
    fishery_symbols: asNullableText(row.fishery_symbols),
  };
}

async function selectOrganisation(
  supabase: OrganisationDbClient,
  id: number,
): Promise<Organisation | null> {
  const { data, error } = await supabase
    .from("organisations")
    .select(ORGANISATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error?.message?.includes("hide_identity") || error?.message?.includes("entity_kind") || error?.message?.includes("postal_same_as_registered") || error?.message?.includes("enabled_jurisdiction_codes")) {
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

    return mapOrganisation({
      ...fallback.data,
      hide_identity: false,
      entity_kind: null,
      acn: null,
      mobile: null,
      registered_address: null,
      postal_address: null,
      postal_same_as_registered: true,
      enabled_jurisdiction_codes: [],
    });
  }

  if (error || !data) {
    return null;
  }

  return mapOrganisation(data as Record<string, unknown>);
}

async function selectJurisdictionProfile(
  supabase: OrganisationDbClient,
  organisationId: number,
  jurisdictionId: number,
): Promise<OrganisationJurisdictionProfile | null> {
  const { data, error } = await supabase
    .from("organisation_jurisdiction_profiles")
    .select(JURISDICTION_PROFILE_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("jurisdiction_id", jurisdictionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapJurisdictionProfile(data as Record<string, unknown>);
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

  const organisation = await selectOrganisation(supabase, id);

  if (!organisation) {
    return null;
  }

  return {
    organisation,
    role,
  };
}

export async function getOrganisationForAdmin(
  id: number,
): Promise<Organisation | null> {
  if (!(await isPlatformAdmin())) {
    return null;
  }

  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  return selectOrganisation(supabase, id);
}

export async function getOrganisationJurisdictionProfile(
  organisationId: number,
  jurisdictionId: number,
): Promise<OrganisationJurisdictionProfile | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  return selectJurisdictionProfile(supabase, organisationId, jurisdictionId);
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
  if (ids.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  if (!supabase) {
    return new Map();
  }

  const fromView = await supabase
    .from("organisation_public_identity")
    .select("organisation_id, hide_identity")
    .in("organisation_id", ids);

  if (!fromView.error) {
    return parseOrganisationHideIdentityRows(fromView.data);
  }

  const fromRpc = await supabase.rpc("organisations_hide_identity", {
    p_ids: ids,
  });

  if (fromRpc.error) {
    console.error(
      "organisations_hide_identity failed",
      fromView.error.message,
      fromRpc.error.message,
    );
    return new Map();
  }

  return parseOrganisationHideIdentityRows(fromRpc.data);
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
    isPlatformAdmin: boolean;
  }) => PublicIdentityDisplay,
): Promise<Record<number, PublicIdentityDisplay>> {
  const organisationIds = parties
    .map((party) => asIntegerId(party.organisation_id))
    .filter((id): id is number => id != null);
  const [hideMap, admin] = await Promise.all([
    listOrganisationHideIdentity(organisationIds),
    isPlatformAdmin(),
  ]);
  const displays: Record<number, PublicIdentityDisplay> = {};

  for (const party of parties) {
    const partyId = asIntegerId(party.id);
    if (partyId == null) {
      continue;
    }

    const orgId = asIntegerId(party.organisation_id);
    displays[partyId] = display({
      name: party.name,
      hideIdentity: orgId != null && hideMap.get(orgId) === true,
      isPlatformAdmin: admin,
    });
  }

  return displays;
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
    ({ name, hideIdentity, isPlatformAdmin }) =>
      publicSellerDisplay({
        sellerName: name,
        hideIdentity,
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
    ({ name, hideIdentity, isPlatformAdmin }) =>
      publicBuyerDisplay({
        buyerName: name,
        hideIdentity,
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
