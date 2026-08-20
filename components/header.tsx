import { AuthLinks } from "@/components/auth-links";
import { HeaderMenu } from "@/components/header-menu";
import { Logo } from "@/components/logo";
import { Nav } from "@/components/nav";
import { pageWidthClassName } from "@/components/surface";
import { canSeeAdmin, isPlatformAdmin } from "@/lib/admin/access";
import { displayName } from "@/lib/auth/display-name";
import { getAdminActionCounts, getMemberActionCounts } from "@/lib/nav/action-counts";
import { getMyUnreadNotificationCount } from "@/lib/notifications/queries";
import { registrationsAllowed } from "@/lib/settings/queries";
import { getUser } from "@/lib/supabase/server";

export async function Header() {
  const user = await getUser();
  const showAdmin = user ? await canSeeAdmin() : false;
  const admin = user ? await isPlatformAdmin() : false;
  const [adminCounts, memberCounts, unreadNotifications, allowRegister] =
    await Promise.all([
      admin ? getAdminActionCounts() : Promise.resolve(null),
      user ? getMemberActionCounts() : Promise.resolve(null),
      user ? getMyUnreadNotificationCount() : Promise.resolve(0),
      user ? Promise.resolve(false) : registrationsAllowed(),
    ]);
  const dashboardBadge = (memberCounts?.total ?? 0) + unreadNotifications;
  const adminBadge = adminCounts?.total ?? 0;

  return (
    <header className="relative shrink-0 bg-ink text-paper">
      <div
        className={`${pageWidthClassName} flex items-center justify-between gap-4 py-3 lg:py-4`}
      >
        <div className="flex min-w-0 items-center gap-x-8">
          <Logo />
          <div className="hidden lg:block">
            <Nav />
          </div>
        </div>
        <div className="hidden lg:block">
          <AuthLinks
            email={user?.email ?? null}
            name={user ? displayName(user) : null}
            showAdmin={showAdmin}
            adminBadge={adminBadge}
            dashboardBadge={dashboardBadge}
            showRegister={allowRegister}
          />
        </div>
        <HeaderMenu
          email={user?.email ?? null}
          name={user ? displayName(user) : null}
          showAdmin={showAdmin}
          adminBadge={adminBadge}
          dashboardBadge={dashboardBadge}
          showRegister={allowRegister}
        />
      </div>
    </header>
  );
}
