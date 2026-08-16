import type { OrganisationRole } from "@/lib/organisations/types";

export function canEditOrganisation(role: OrganisationRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canAddMember(role: OrganisationRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canAssignRole(
  actorRole: OrganisationRole,
  newRole: OrganisationRole,
) {
  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return newRole === "ADMIN" || newRole === "MEMBER";
  }

  return false;
}

export function canChangeMemberRole(role: OrganisationRole) {
  return role === "OWNER";
}

export function canRemoveMember(
  actorRole: OrganisationRole,
  targetRole: OrganisationRole,
  isSelf: boolean,
  ownerCount: number,
) {
  if (targetRole === "OWNER" && ownerCount <= 1) {
    return false;
  }

  if (isSelf) {
    return true;
  }

  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return targetRole === "MEMBER";
  }

  return false;
}
