import Link from "next/link";
import { InAppNotificationList } from "@/components/in-app-notification-list";
import { NavBadge } from "@/components/nav-badge";
import { NotificationSettingsForm } from "@/components/notification-settings-form";
import {
  getMyNotificationPreferences,
  myPersonalNotificationEmailIds,
} from "@/lib/alerts/queries";
import { listMyInAppNotifications } from "@/lib/notifications/queries";
import { requireDashboardUser } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Notifications",
};

function tabClassName(active: boolean) {
  return active
    ? "-mb-px inline-flex items-center gap-1.5 border-b-2 border-sea pb-2 font-medium text-ink"
    : "inline-flex items-center gap-1.5 pb-2 text-ink-muted hover:text-ink";
}

export default async function DashboardNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireDashboardUser("/dashboard/notifications");
  const params = await searchParams;
  const tab = params.tab === "channels" ? "channels" : "inbox";
  const [prefs, emailIds, notifications] = await Promise.all([
    getMyNotificationPreferences(),
    myPersonalNotificationEmailIds(),
    listMyInAppNotifications(),
  ]);
  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Notifications
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          These settings apply to you, not the whole organisation.
          Platform-wide email switches stay on Admin settings.
        </p>
      </div>
      <nav aria-label="Notification sections">
        <ul className="flex flex-wrap gap-x-6 border-b border-line">
          <li>
            <Link
              href="/dashboard/notifications"
              className={tabClassName(tab === "inbox")}
              aria-current={tab === "inbox" ? "page" : undefined}
            >
              Inbox
              <NavBadge count={unread} />
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/notifications?tab=channels"
              className={tabClassName(tab === "channels")}
              aria-current={tab === "channels" ? "page" : undefined}
            >
              Channels
            </Link>
          </li>
        </ul>
      </nav>
      {tab === "channels" ? (
        <NotificationSettingsForm
          disabledEmails={prefs.disabledEmails}
          disabledInApp={prefs.disabledInApp}
          emailIds={emailIds}
        />
      ) : (
        <InAppNotificationList notifications={notifications} />
      )}
    </div>
  );
}
