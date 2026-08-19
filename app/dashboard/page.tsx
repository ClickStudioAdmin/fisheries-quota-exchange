import { AccountOverviewSection } from "@/components/account-overview";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Overview",
};

export default async function DashboardPage() {
  const account = await resolveDashboardAccount("/dashboard");

  return (
    <AccountOverviewSection
      organisationId={account.selected?.id ?? null}
      user={account.user}
    />
  );
}
