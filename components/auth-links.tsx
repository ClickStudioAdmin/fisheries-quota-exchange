import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { MemberIcon } from "@/components/member-icon";

type AuthLinksProps = {
  email: string | null;
  name?: string | null;
  showAdmin?: boolean;
};

export function AuthLinks({ email, name, showAdmin = false }: AuthLinksProps) {
  if (email) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {showAdmin ? (
          <Link href="/admin" className="text-paper/75 hover:text-paper">
            Admin
          </Link>
        ) : null}
        <Link href="/dashboard" className="text-paper/75 hover:text-paper">
          Dashboard
        </Link>
        <span className="flex items-center gap-2 text-paper">
          <MemberIcon className="h-5 w-5 shrink-0" />
          <span className="max-w-40 truncate" title={email}>
            {name || email}
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
      <Link href="/register" className="text-paper hover:text-paper">
        Register
      </Link>
    </div>
  );
}
