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
    <NotificationSettingsForm
      disabledEmails={prefs.disabledEmails}
      disabledInApp={prefs.disabledInApp}
      emailIds={emailIds}
    >
      <InAppNotificationList notifications={notifications} />
    </NotificationSettingsForm>
  );
}
