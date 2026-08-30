export const ACTIVE_ORGANISATION_COOKIE = "fqx_active_organisation";

export type ActiveOrganisationResolution = {
  selectedId: number | null;
  bindId: number | null;
  needsSelection: boolean;
  clearCookie: boolean;
};

export function parseActiveOrganisationId(
  value: string | undefined | null,
): number | null {
  if (!value) {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export function resolveActiveOrganisation(
  organisationIds: readonly number[],
  cookieId: number | null,
): ActiveOrganisationResolution {
  if (organisationIds.length === 0) {
    return {
      selectedId: null,
      bindId: null,
      needsSelection: false,
      clearCookie: cookieId != null,
    };
  }

  if (organisationIds.length === 1) {
    const id = organisationIds[0];
    return {
      selectedId: id,
      bindId: cookieId === id ? null : id,
      needsSelection: false,
      clearCookie: false,
    };
  }

  if (cookieId != null && organisationIds.includes(cookieId)) {
    return {
      selectedId: cookieId,
      bindId: null,
      needsSelection: false,
      clearCookie: false,
    };
  }

  return {
    selectedId: null,
    bindId: null,
    needsSelection: true,
    clearCookie: cookieId != null,
  };
}

export function isInvitationPath(pathname: string) {
  return pathname === "/invitations" || pathname.startsWith("/invitations/");
}

export function pathRequiresActiveOrganisation(pathname: string) {
  if (pathname === "/select-account" || pathname.startsWith("/select-account/")) {
    return false;
  }

  if (isInvitationPath(pathname)) {
    return false;
  }

  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/organisations") ||
    pathname.startsWith("/orders")
  );
}

export function selectAccountPath(next?: string | null) {
  const value = next?.trim();

  if (!value || value === "/select-account" || value.startsWith("/select-account?")) {
    return "/select-account";
  }

  return `/select-account?next=${encodeURIComponent(value)}`;
}

export function afterAccountSelectionPath(next: string | null | undefined) {
  const value = next?.trim() ?? "";

  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://") ||
    value === "/login" ||
    value.startsWith("/login?") ||
    value === "/select-account" ||
    value.startsWith("/select-account?")
  ) {
    return "/dashboard";
  }

  return value;
}

export function activeOrganisationCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/" as const,
  };
}
