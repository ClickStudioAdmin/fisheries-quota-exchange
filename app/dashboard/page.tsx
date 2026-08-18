import { AccountOverviewSection } from "@/components/account-overview";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Overview",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(params.account, "/dashboard");

  return (
    <AccountOverviewSection
      organisationId={account.selected?.id ?? null}
      user={account.user}
    />
  );
}
