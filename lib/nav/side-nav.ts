export type SideNavLink = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
  accountId?: number;
  isDefault?: boolean;
  alsoMatch?: string[];
  badge?: number;
};

export type SideNavGroup = {
  label: string;
  children: SideNavLink[];
};

export type SideNavSection = {
  heading: string;
  items: SideNavLink[];
};

export type SideNavItem = SideNavLink | SideNavGroup | SideNavSection;

export function isNavGroup(item: SideNavItem): item is SideNavGroup {
  return "children" in item;
}

export function isNavSection(item: SideNavItem): item is SideNavSection {
  return "heading" in item;
}

export function accountFromLocation(
  pathname: string,
  searchParams: { get: (name: string) => string | null },
) {
  return (
    searchParams.get("account") ??
    pathname.match(/^\/organisations\/(\d+)/)?.[1] ??
    null
  );
}

export function dashboardSectionPath(pathname: string) {
  if (pathname.startsWith("/dashboard")) {
    return pathname;
  }

  if (pathname.split("/").includes("listings")) {
    return "/dashboard/listings";
  }

  if (pathname.split("/").includes("auctions")) {
    return "/dashboard/holdings";
  }

  if (pathname === "/orders" || pathname.startsWith("/orders/")) {
    return "/dashboard/orders";
  }

  return "/dashboard";
}

export function withAccount(href: string, accountParam: string | null) {
  if (!accountParam || !href.startsWith("/dashboard")) {
    return href;
  }

  const [path, existing] = href.split("?");
  const params = new URLSearchParams(existing);
  if (!params.has("account")) {
    params.set("account", accountParam);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function isSideNavActive(
  pathname: string,
  accountParam: string | null,
  item: SideNavLink,
) {
  if (item.accountId != null) {
    if (accountParam) {
      return accountParam === String(item.accountId);
    }

    return Boolean(item.isDefault) && pathname.startsWith("/dashboard");
  }

  if (
    item.alsoMatch?.some((part) => {
      if (part.startsWith("/")) {
        return pathname === part || pathname.startsWith(`${part}/`);
      }

      return pathname.split("/").includes(part);
    })
  ) {
    return true;
  }

  if (item.match === "prefix") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return pathname === item.href;
}

export function itemHref(
  item: SideNavLink,
  pathname: string,
  accountParam: string | null,
) {
  if (item.accountId) {
    return `${dashboardSectionPath(pathname)}?account=${item.accountId}`;
  }

  return withAccount(item.href, accountParam);
}

export function collectSideNavLinks(items: readonly SideNavItem[]): SideNavLink[] {
  const links: SideNavLink[] = [];

  for (const item of items) {
    if (isNavSection(item)) {
      links.push(...item.items);
    } else if (isNavGroup(item)) {
      links.push(...item.children);
    } else {
      links.push(item);
    }
  }

  return links;
}

export function currentSideNavLabel(
  items: readonly SideNavItem[],
  pathname: string,
  accountParam: string | null,
  fallback: string,
) {
  const active = collectSideNavLinks(items).find((item) =>
    isSideNavActive(pathname, accountParam, item),
  );

  return active?.label ?? fallback;
}

export function sideNavBadgeTotal(items: readonly SideNavItem[]) {
  return collectSideNavLinks(items).reduce(
    (sum, item) => sum + (item.badge ?? 0),
    0,
  );
}

export function groupBadge(item: SideNavGroup) {
  return item.children.reduce((sum, child) => sum + (child.badge ?? 0), 0);
}
