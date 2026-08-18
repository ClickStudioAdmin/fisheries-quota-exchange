import { NotificationSettingsForm } from "@/components/notification-settings-form";
import {
  getMyDisabledEmails,
  myPersonalNotificationEmailIds,
} from "@/lib/alerts/queries";
import { requireDashboardUser } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Notifications",
};

export default async function DashboardNotificationsPage() {
  await requireDashboardUser("/dashboard/notifications");
  const [disabledEmails, emailIds] = await Promise.all([
    getMyDisabledEmails(),
    myPersonalNotificationEmailIds(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Notifications
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          These settings apply to your email, not the whole organisation.
          Platform-wide switches stay on Admin settings.
        </p>
      </div>
      <NotificationSettingsForm
        disabledEmails={disabledEmails}
        emailIds={emailIds}
      />
    </div>
  );
}
