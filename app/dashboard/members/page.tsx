import { redirect } from "next/navigation";

export const metadata = {
  title: "Account details",
};

export default async function DashboardMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ tab: "members" });

  if (params.account) {
    query.set("account", params.account);
  }

  redirect(`/dashboard/profile?${query.toString()}`);
}
