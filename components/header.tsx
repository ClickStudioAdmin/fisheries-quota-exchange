import { AuthLinks } from "@/components/auth-links";
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
          dashboardBadge={(memberCounts?.total ?? 0) + unreadNotifications}
          showRegister={allowRegister}
        />
      </div>
    </header>
  );
}
