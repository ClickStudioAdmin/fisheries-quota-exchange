"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/fisheries", label: "Fisheries" },
  { href: "/how-it-works", label: "How it works" },
];

function isActive(pathname: string, href: string) {
  if (href === "/marketplace") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith("/auctions/")
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {links.map((link) => {
          const active = isActive(pathname, link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={
                  active
                    ? "border-b border-paper pb-0.5 font-medium"
                    : "text-paper/75 hover:text-paper"
                }
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
