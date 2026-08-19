import { AccountOrdersSection } from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Orders",
};

export default async function DashboardOrdersPage() {
  const account = await resolveDashboardAccount("/dashboard/orders");

  if (account.needsSetup) {
    return null;
  }

  return <AccountOrdersSection organisationId={account.selected.id} />;
}
