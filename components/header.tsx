import { AuthLinks } from "@/components/auth-links";
import { Logo } from "@/components/logo";
import { Nav } from "@/components/nav";
import { pageWidthClassName } from "@/components/surface";
import { canSeeAdmin, isPlatformAdmin } from "@/lib/admin/access";
import { stopImpersonationAction } from "@/lib/admin/impersonate-actions";
import { getActiveImpersonationEmail } from "@/lib/admin/impersonate";
import { displayName } from "@/lib/auth/display-name";
import { getAdminActionCounts, getMemberActionCounts } from "@/lib/nav/action-counts";
import { registrationsAllowed } from "@/lib/settings/queries";
import { getUser } from "@/lib/supabase/server";

export async function Header() {
  const user = await getUser();
  const impersonatingEmail = user
    ? await getActiveImpersonationEmail(user.email)
    : null;
  const impersonating = Boolean(impersonatingEmail);
  const showAdmin = user ? await canSeeAdmin() : false;
  const admin = user ? await isPlatformAdmin() : false;
  const [adminCounts, memberCounts, allowRegister] = await Promise.all([
    admin ? getAdminActionCounts() : Promise.resolve(null),
    user ? getMemberActionCounts() : Promise.resolve(null),
    user ? Promise.resolve(false) : registrationsAllowed(),
  ]);
  const viewedAs = user ? displayName(user) : impersonatingEmail;

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
          adminBadge={adminCounts?.total ?? 0}
          dashboardBadge={memberCounts?.total ?? 0}
          showRegister={allowRegister}
          impersonating={impersonating}
        />
      </div>
      {impersonating ? (
        <div className="bg-amber-400 text-ink">
          <div
            className={`${pageWidthClassName} flex flex-wrap items-center justify-between gap-3 py-2 text-sm`}
          >
            <p>
              Viewing as {viewedAs}.{" "}
              <span className="text-ink/80">
                You are signed in as this user.
              </span>
            </p>
            <form action={stopImpersonationAction}>
              <button type="submit" className="font-medium underline">
                Switch back to admin
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  );
}
