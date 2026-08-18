import { InAppNotificationList } from "@/components/in-app-notification-list";
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

export default async function DashboardNotificationsPage() {
  await requireDashboardUser("/dashboard/notifications");
  const [prefs, emailIds, notifications] = await Promise.all([
    getMyNotificationPreferences(),
    myPersonalNotificationEmailIds(),
    listMyInAppNotifications(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Notifications
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          In-app notices appear in the inbox below. Email and in-app can be
          switched separately. These settings apply to you, not the whole
          organisation. Platform-wide email switches stay on Admin settings.
        </p>
      </div>
      <InAppNotificationList notifications={notifications} />
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Channels</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Turn a channel off for a message to stop that type. You can leave
            one on and the other off.
          </p>
        </div>
        <NotificationSettingsForm
          disabledEmails={prefs.disabledEmails}
          disabledInApp={prefs.disabledInApp}
          emailIds={emailIds}
        />
      </div>
    </div>
  );
}
