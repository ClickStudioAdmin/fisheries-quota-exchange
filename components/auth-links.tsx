import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";

type AuthLinksProps = {
  email: string | null;
};

export function AuthLinks({ email }: AuthLinksProps) {
  if (email) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/dashboard" className="text-paper/75 hover:text-paper">
          Dashboard
        </Link>
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
