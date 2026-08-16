"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/fisheries", label: "Fisheries" },
  { href: "/auctions", label: "Auctions" },
  { href: "/about", label: "About" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-ink text-paper">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="block text-sm uppercase tracking-[0.18em] text-paper/70">
            FQX
          </span>
          <span className="block text-base sm:text-lg">
            Fisheries Quota Exchange
          </span>
        </Link>
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
      </div>
    </header>
  );
}
