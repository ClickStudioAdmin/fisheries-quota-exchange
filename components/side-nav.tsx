"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type SideNavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
  accountId?: number;
  isDefault?: boolean;
  alsoMatch?: string[];
};

type SideNavProps = {
  title: string;
  items: SideNavItem[];
};

function accountFromLocation(
  pathname: string,
  searchParams: { get: (name: string) => string | null },
) {
  return (
    searchParams.get("account") ??
    pathname.match(/^\/organisations\/(\d+)/)?.[1] ??
    null
  );
}

function dashboardSectionPath(pathname: string) {
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

function withAccount(href: string, accountParam: string | null) {
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

function isActive(
  pathname: string,
  accountParam: string | null,
  item: SideNavItem,
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

export function SideNav({ title, items }: SideNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accountParam = accountFromLocation(pathname, searchParams);

  return (
    <nav
      aria-label={title}
      className="border border-line bg-paper-raised p-4"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
        {title}
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {items.map((item) => {
          const active = isActive(pathname, accountParam, item);
          const href = item.accountId
            ? `${dashboardSectionPath(pathname)}?account=${item.accountId}`
            : withAccount(item.href, accountParam);

          return (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={href}
                className={
                  active
                    ? "block bg-paper px-3 py-2 font-medium text-ink"
                    : "block px-3 py-2 text-ink-muted hover:bg-paper hover:text-ink"
                }
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
