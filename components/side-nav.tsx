"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export type SideNavLink = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
  accountId?: number;
  isDefault?: boolean;
  alsoMatch?: string[];
};

export type SideNavGroup = {
  label: string;
  children: SideNavLink[];
};

export type SideNavItem = SideNavLink | SideNavGroup;

type SideNavProps = {
  title: string;
  items: SideNavItem[];
};

function isNavGroup(item: SideNavItem): item is SideNavGroup {
  return "children" in item;
}

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

function itemHref(
  item: SideNavLink,
  pathname: string,
  accountParam: string | null,
) {
  if (item.accountId) {
    return `${dashboardSectionPath(pathname)}?account=${item.accountId}`;
  }

  return withAccount(item.href, accountParam);
}

function navLinkClassName(active: boolean) {
  return active
    ? "block bg-paper px-3 py-2 font-medium text-ink"
    : "block px-3 py-2 text-ink-muted hover:bg-paper hover:text-ink";
}

function NavLink({
  item,
  pathname,
  accountParam,
}: {
  item: SideNavLink;
  pathname: string;
  accountParam: string | null;
}) {
  const active = isActive(pathname, accountParam, item);

  return (
    <Link
      href={itemHref(item, pathname, accountParam)}
      className={navLinkClassName(active)}
      aria-current={active ? "page" : undefined}
    >
      {item.label}
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  accountParam,
}: {
  item: SideNavGroup;
  pathname: string;
  accountParam: string | null;
}) {
  const childActive = item.children.some((child) =>
    isActive(pathname, accountParam, child),
  );
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) {
      setOpen(true);
    }
  }, [childActive]);

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={
          childActive
            ? "flex w-full items-center justify-between px-3 py-2 text-left font-medium text-ink"
            : "flex w-full items-center justify-between px-3 py-2 text-left text-ink-muted hover:bg-paper hover:text-ink"
        }
      >
        <span>{item.label}</span>
        <span aria-hidden className="text-xs">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <ul className="mt-1 space-y-1 border-l border-line ml-3 pl-1">
          {item.children.map((child) => (
            <li key={`${child.href}-${child.label}`}>
              <NavLink
                item={child}
                pathname={pathname}
                accountParam={accountParam}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
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
          if (isNavGroup(item)) {
            return (
              <NavGroup
                key={item.label}
                item={item}
                pathname={pathname}
                accountParam={accountParam}
              />
            );
          }

          return (
            <li key={`${item.href}-${item.label}`}>
              <NavLink
                item={item}
                pathname={pathname}
                accountParam={accountParam}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
