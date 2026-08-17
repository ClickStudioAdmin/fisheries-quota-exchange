import { AuthLinks } from "@/components/auth-links";
import { Logo } from "@/components/logo";
import { Nav } from "@/components/nav";
import { pageWidthClassName } from "@/components/surface";
import { canSeeAdmin } from "@/lib/admin/access";
import { displayName } from "@/lib/auth/display-name";
import { getUser } from "@/lib/supabase/server";

export async function Header() {
  const user = await getUser();
  const showAdmin = user ? await canSeeAdmin() : false;

  return (
    <header className="shrink-0 bg-ink text-paper">
      <div className={`${pageWidthClassName} flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Logo />
          <Nav />
        </div>
        <AuthLinks
          email={user?.email ?? null}
          name={user ? displayName(user) : null}
          showAdmin={showAdmin}
        />
      </div>
    </header>
  );
}
