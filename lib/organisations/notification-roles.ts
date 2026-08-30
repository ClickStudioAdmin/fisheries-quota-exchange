import type { OrganisationRole } from "./types";

const ROLE_ORDER: OrganisationRole[] = ["OWNER", "ADMIN", "MEMBER"];

export const DEFAULT_NOTIFICATION_ROLES: OrganisationRole[] = [
  "OWNER",
  "ADMIN",
];

function isNotificationRole(value: string): value is OrganisationRole {
  return ROLE_ORDER.includes(value as OrganisationRole);
}

export function parseNotificationRoles(value: unknown): OrganisationRole[] {
  const incoming = Array.isArray(value)
    ? value.filter((role): role is OrganisationRole =>
        isNotificationRole(String(role)),
      )
    : [];
  const roles = ROLE_ORDER.filter((role) => incoming.includes(role));
  return roles.length > 0 ? [...roles] : [...DEFAULT_NOTIFICATION_ROLES];
}

export function notificationRolesFromForm(formData: FormData): OrganisationRole[] {
  const selected = new Set(
    formData
      .getAll("notification_role")
      .map((value) => String(value))
      .filter(isNotificationRole),
  );
  return ROLE_ORDER.filter((role) => selected.has(role));
}
