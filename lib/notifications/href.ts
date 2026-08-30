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

export function inAppNotificationLinkLabel(template: string, href: string) {
  if (template === "member_added") {
    return "Accept invitation";
  }

  if (template === "payment_reminder" || template === "purchase_received") {
    return "Pay FQX";
  }

  if (template === "payments_setup_complete") {
    return "Business Settings";
  }

  if (
    template === "member_role_changed" ||
    template === "ownership_transferred"
  ) {
    return "Open business";
  }

  const path = href.split("?")[0];

  if (path.startsWith("/invitations/")) {
    return "Accept invitation";
  }

  if (path.startsWith("/marketplace/")) {
    return "View listing";
  }

  if (path.startsWith("/auctions/")) {
    return "View auction";
  }

  if (path.startsWith("/orders/")) {
    return "View order";
  }

  if (path.startsWith("/dashboard/holdings/")) {
    return "View holding";
  }

  if (path.startsWith("/dashboard/account")) {
    return "Business Settings";
  }

  if (path.startsWith("/admin/holdings")) {
    return "Admin holdings";
  }

  if (path.startsWith("/admin/listings")) {
    return "Admin listings";
  }

  if (path.startsWith("/admin/orders")) {
    return "Admin orders";
  }

  return "Open";
}
