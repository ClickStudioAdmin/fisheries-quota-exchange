export function accountPath(organisationId: number, path = "/dashboard") {
  return `${path}?account=${organisationId}`;
}

export function adminUserPath(email: string) {
  return `/admin/users/${encodeURIComponent(email.trim().toLowerCase())}`;
}

export function parseAdminUserEmailParam(value: string) {
  try {
    const email = decodeURIComponent(value).trim().toLowerCase();
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}
