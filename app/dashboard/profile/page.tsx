import { AccountProfileSection } from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Profile details",
};

export default async function DashboardProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(
    params.account,
    "/dashboard/profile",
  );

  if (account.needsSetup) {
    return null;
  }

  return (
    <AccountProfileSection
      organisationId={account.selected.id}
      user={account.user}
    />
  );
}
