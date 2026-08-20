"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NavBadge } from "@/components/nav-badge";
import { SideNav } from "@/components/side-nav";
import {
  accountFromLocation,
  currentSideNavLabel,
  sideNavBadgeTotal,
  type SideNavItem,
} from "@/lib/nav/side-nav";

export function AreaNav({
  title,
  operatingAs,
  switchAccountHref,
  items,
}: {
  title: string;
  operatingAs?: string | null;
  switchAccountHref?: string | null;
  items: SideNavItem[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const menuId = useId();
  const accountParam = accountFromLocation(pathname, searchParams);
  const currentLabel = currentSideNavLabel(
    items,
    pathname,
    accountParam,
    title,
  );
  const badge = sideNavBadgeTotal(items);

  useEffect(() => {
    setOpen(false);
  }, [pathname, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="lg:hidden">
        <div className="border border-line bg-paper-raised px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {operatingAs ? (
                <p className="truncate text-sm font-medium text-ink">
                  {operatingAs}
                </p>
              ) : (
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                  {title}
                </p>
              )}
              <p className="mt-0.5 truncate text-sm text-ink-muted">
                {currentLabel}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 border border-line bg-paper px-3 py-2 text-sm font-medium text-ink"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((value) => !value)}
            >
              Menu
              <NavBadge count={badge} />
            </button>
          </div>
          {operatingAs && switchAccountHref ? (
            <p className="mt-2">
              <Link
                href={switchAccountHref}
                className="text-sm font-medium text-sea underline"
              >
                Switch business
              </Link>
            </p>
          ) : null}
        </div>
        {open ? (
          <div id={menuId} className="mt-2">
            <SideNav title={title} items={items} />
          </div>
        ) : null}
      </div>
      <div className="hidden space-y-4 lg:block">
        {operatingAs ? (
          <div className="border border-line bg-paper-raised p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
              Operating as
            </p>
            <p className="mt-2 text-sm font-medium text-ink">{operatingAs}</p>
            {switchAccountHref ? (
              <p className="mt-2">
                <Link
                  href={switchAccountHref}
                  className="text-sm font-medium text-sea underline"
                >
                  Switch business
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
        <SideNav title={title} items={items} />
      </div>
    </>
  );
}
