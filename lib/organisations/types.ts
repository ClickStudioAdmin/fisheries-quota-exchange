export const ORGANISATION_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;

export type OrganisationRole = (typeof ORGANISATION_ROLES)[number];

export type Organisation = {
  id: number;
  legal_name: string;
  trading_name: string | null;
  abn: string | null;
  created_at: string;
  updated_at: string;
};

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
