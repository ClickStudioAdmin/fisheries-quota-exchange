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
  role: OrganisationRole;
  created_at: string;
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
