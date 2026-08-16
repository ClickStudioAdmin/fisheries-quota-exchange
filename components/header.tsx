import Link from "next/link";
import { AuthLinks } from "@/components/auth-links";
import { Nav } from "@/components/nav";
import { getUser } from "@/lib/supabase/server";

export async function Header() {
  const user = await getUser();

  return (
    <header className="bg-ink text-paper">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            <span className="block text-sm uppercase tracking-[0.18em] text-paper/70">
              FQX
            </span>
            <span className="block text-base sm:text-lg">
              Fisheries Quota Exchange
            </span>
          </Link>
          <AuthLinks email={user?.email ?? null} />
        </div>
        <Nav />
      </div>
    </header>
  );
}
