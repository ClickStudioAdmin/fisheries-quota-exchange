export function accountPath(
  _organisationId?: number | null,
  path = "/dashboard",
  query?: Record<string, string>,
) {
  const params = new URLSearchParams(query);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function adminUserPath(email: string) {
  return `/admin/users/${encodeURIComponent(email.trim().toLowerCase())}`;
}

export function adminHoldingPath(id: number) {
  return `/admin/holdings/${id}`;
}

export function dashboardHoldingPath(holdingId: number, _organisationId?: number) {
  return `/dashboard/holdings/${holdingId}`;
}

export function accountPaymentsPath(_organisationId?: number | null) {
  return "/dashboard/profile?tab=payments";
}

export function parseAdminUserEmailParam(value: string) {
  try {
    const email = decodeURIComponent(value).trim().toLowerCase();
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}
