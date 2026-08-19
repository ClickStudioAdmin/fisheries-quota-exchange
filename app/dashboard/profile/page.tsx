import { DashboardTabs } from "@/components/dashboard-tabs";
import {
  AccountAlertsSection,
  AccountProfileSection,
  AccountSecuritySection,
} from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Profile",
};

export default async function DashboardProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount("/dashboard/profile");
  const tab =
    params.tab === "security" || params.tab === "alerts"
      ? params.tab
      : "details";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Profile
      </h1>
      <DashboardTabs
        label="Profile sections"
        active={tab}
        items={[
          { id: "details", href: "/dashboard/profile", label: "Details" },
          {
            id: "security",
            href: "/dashboard/profile?tab=security",
            label: "Password and Security",
          },
          { id: "alerts", href: "/dashboard/profile?tab=alerts", label: "Alerts" },
        ]}
      />
      {tab === "security" ? (
        <AccountSecuritySection />
      ) : tab === "alerts" ? (
        <AccountAlertsSection />
      ) : (
        <AccountProfileSection user={account.user} />
      )}
    </div>
  );
}
