export function safeNextPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return "/dashboard";
  }

  return value;
}

export function loginPath(next?: string | null) {
  const value = next?.trim();

  if (!value) {
    return "/login";
  }

  return `/login?next=${encodeURIComponent(safeNextPath(value))}`;
}

export function postLoginPath(
  next: string | null | undefined,
  isAdmin: boolean,
) {
  if (next && next.trim()) {
    return safeNextPath(next);
  }

  return isAdmin ? "/admin" : "/dashboard";
}
