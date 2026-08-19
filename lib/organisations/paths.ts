export function accountPath(
  organisationId: number,
  path = "/dashboard",
  query?: Record<string, string>,
) {
  const params = new URLSearchParams({ account: String(organisationId) });

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      params.set(key, value);
    }
  }

  return `${path}?${params.toString()}`;
}

export function adminUserPath(email: string) {
  return `/admin/users/${encodeURIComponent(email.trim().toLowerCase())}`;
}

export function adminHoldingPath(id: number) {
  return `/admin/holdings/${id}`;
}

export function dashboardHoldingPath(holdingId: number, organisationId: number) {
  return accountPath(organisationId, `/dashboard/holdings/${holdingId}`);
}

export function accountPaymentsPath(organisationId?: number | null) {
  if (organisationId) {
    return accountPath(organisationId, "/dashboard/profile", { tab: "payments" });
  }

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
