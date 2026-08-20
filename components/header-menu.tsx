"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { NavBadge } from "@/components/nav-badge";
import { isPrimaryNavActive, PRIMARY_NAV_LINKS } from "@/components/nav";
import { pageWidthClassName } from "@/components/surface";

export function HeaderMenu({
  email,
  name,
  showAdmin,
  adminBadge,
  dashboardBadge,
  showRegister,
}: {
  email: string | null;
  name?: string | null;
  showAdmin: boolean;
  adminBadge: number;
  dashboardBadge: number;
  showRegister: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const badge = dashboardBadge + adminBadge;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex items-center gap-2 border border-paper/30 px-3 py-2 text-sm font-medium text-paper"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        Menu
        <NavBadge count={badge} tone="onDark" />
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute inset-x-0 top-full z-20 border-t border-paper/20 bg-ink"
        >
          <nav
            aria-label="Site"
            className={`${pageWidthClassName} py-3`}
          >
            <ul className="space-y-1 text-sm">
              {PRIMARY_NAV_LINKS.map((link) => {
                const active = isPrimaryNavActive(pathname, link.href);

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={
                        active
                          ? "block border-b border-paper py-2 font-medium text-paper"
                          : "block py-2 text-paper/75 hover:text-paper"
                      }
                      aria-current={active ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
              {email ? (
                <>
                  {showAdmin ? (
                    <li>
                      <Link
                        href="/admin"
                        className="flex items-center justify-between gap-2 py-2 text-paper/75 hover:text-paper"
                      >
                        <span>Admin</span>
                        <NavBadge count={adminBadge} tone="onDark" />
                      </Link>
                    </li>
                  ) : null}
                  <li>
                    <Link
                      href="/dashboard"
                      className="flex items-center justify-between gap-2 py-2 text-paper/75 hover:text-paper"
                    >
                      <span>Dashboard</span>
                      <NavBadge count={dashboardBadge} tone="onDark" />
                    </Link>
                  </li>
                  <li className="py-2 text-paper">{name || email}</li>
                  <li>
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="py-2 text-paper/75 hover:text-paper"
                      >
                        Log out
                      </button>
                    </form>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      href="/login"
                      className="block py-2 text-paper/75 hover:text-paper"
                    >
                      Log in
                    </Link>
                  </li>
                  {showRegister ? (
                    <li>
                      <Link
                        href="/register"
                        className="block py-2 text-paper hover:text-paper"
                      >
                        Register
                      </Link>
                    </li>
                  ) : null}
                </>
              )}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
