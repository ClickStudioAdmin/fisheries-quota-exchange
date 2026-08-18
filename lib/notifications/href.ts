export function inAppNotificationHref(actionUrl?: string) {
  const value = actionUrl?.trim() ?? "";

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = new URL(value);
    const path = `${url.pathname}${url.search}`;
    if (path.startsWith("/") && !path.startsWith("//")) {
      return path;
    }
  } catch {
    // Not a URL.
  }

  return "/dashboard/notifications";
}

export function safeAppPath(value: string) {
  const path = value.trim();

  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }

  return "/dashboard/notifications";
}
