"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SideNavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

type SideNavProps = {
  title: string;
  items: SideNavItem[];
};

function isActive(pathname: string, item: SideNavItem) {
  if (item.match === "prefix") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return pathname === item.href;
}

export function SideNav({ title, items }: SideNavProps) {
  const pathname = usePathname();

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
          const active = isActive(pathname, item);

          return (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
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
