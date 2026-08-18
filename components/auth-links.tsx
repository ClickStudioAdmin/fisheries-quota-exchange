import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { MemberIcon } from "@/components/member-icon";
import { NavBadge } from "@/components/nav-badge";

type AuthLinksProps = {
  email: string | null;
  name?: string | null;
  showAdmin?: boolean;
  adminBadge?: number;
  dashboardBadge?: number;
  showRegister?: boolean;
};

function NavTextLink({
  href,
  children,
  badge,
}: {
  href: string;
  children: string;
  badge?: number;
}) {
  const count = badge ?? 0;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-paper/75 hover:text-paper"
      aria-label={
        count > 0
          ? `${children}, ${count} ${count === 1 ? "action" : "actions"} required`
          : undefined
      }
    >
      {children}
      <NavBadge count={count} tone="onDark" />
    </Link>
  );
}

export function AuthLinks({
  email,
  name,
  showAdmin = false,
  adminBadge = 0,
  dashboardBadge = 0,
  showRegister = true,
}: AuthLinksProps) {
  if (email) {
    const label = name || email;

    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {showAdmin ? (
          <NavTextLink href="/admin" badge={adminBadge}>
            Admin
          </NavTextLink>
        ) : null}
        <NavTextLink href="/dashboard" badge={dashboardBadge}>
          Dashboard
        </NavTextLink>
        <span className="flex items-center gap-2 text-paper">
          <MemberIcon className="h-5 w-5 shrink-0" />
          <span className="max-w-40 truncate" title={email}>
            {label}
          </span>
        </span>
        <form action={logoutAction}>
          <button type="submit" className="text-paper/75 hover:text-paper">
            Log out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <Link href="/login" className="text-paper/75 hover:text-paper">
        Log in
      </Link>
      {showRegister ? (
        <Link href="/register" className="text-paper hover:text-paper">
          Register
        </Link>
      ) : null}
    </div>
  );
}
