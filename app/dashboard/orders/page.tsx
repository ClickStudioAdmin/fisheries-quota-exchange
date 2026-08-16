import { AccountOrdersSection } from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Orders",
};

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(
    params.account,
    "/dashboard/orders",
  );

  if (account.needsSetup) {
    return null;
  }

  return <AccountOrdersSection organisationId={account.selected.id} />;
}
