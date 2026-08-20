import type { ProductEmailId } from "@/lib/email/product-emails";
import type { AustralianAddress } from "@/lib/organisations/address";

export const ORGANISATION_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;

export type OrganisationRole = (typeof ORGANISATION_ROLES)[number];

export const ENTITY_KINDS = ["INDIVIDUAL", "COMPANY"] as const;

export type EntityKind = (typeof ENTITY_KINDS)[number];

export type Organisation = {
  id: number;
  legal_name: string;
  trading_name: string | null;
  abn: string | null;
  hide_identity: boolean;
  notification_roles: OrganisationRole[];
  disabled_notification_emails: ProductEmailId[];
  disabled_notification_in_app: ProductEmailId[];
  created_at: string;
  updated_at: string;
  entity_kind: EntityKind | null;
  acn: string | null;
  date_of_birth: string | null;
  mobile: string | null;
  registered_address: AustralianAddress | null;
  postal_address: AustralianAddress | null;
  postal_same_as_registered: boolean;
  enabled_jurisdiction_codes: string[];
};

export type OrganisationJurisdictionProfile = {
  organisation_id: number;
  jurisdiction_id: number;
  client_reference: string | null;
  licence_number: string | null;
  fishery_symbols: string | null;
};

export function isEntityKind(value: string): value is EntityKind {
  return (ENTITY_KINDS as readonly string[]).includes(value);
}

export function entityKindLabel(kind: EntityKind) {
  return kind === "COMPANY" ? "Company" : "Individual";
}

export type OrganisationMember = {
  id: number;
  organisation_id: number;
  email: string;
  full_name: string;
  role: OrganisationRole;
  created_at: string;
};

export type OrganisationInvitation = {
  id: number;
  organisation_id: number;
  organisation_name: string;
  email: string;
  role: OrganisationRole;
  invited_by_email: string;
  created_at: string;
  expires_at: string;
  token: string;
};

export type OrganisationSummary = {
  id: number;
  legal_name: string;
  trading_name: string | null;
  role: OrganisationRole;
};

export function isOrganisationRole(value: string): value is OrganisationRole {
  return ORGANISATION_ROLES.includes(value as OrganisationRole);
}

export function organisationRoleLabel(role: OrganisationRole) {
  if (role === "OWNER") {
    return "Owner";
  }

  if (role === "ADMIN") {
    return "Admin";
  }

  return "Member";
}

export function highestOrganisationRole(
  roles: readonly OrganisationRole[],
): OrganisationRole {
  if (roles.includes("OWNER")) {
    return "OWNER";
  }

  if (roles.includes("ADMIN")) {
    return "ADMIN";
  }

  return "MEMBER";
}
