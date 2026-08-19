import { redirect } from "next/navigation";

export const metadata = {
  title: "Payments",
};

export default async function DashboardPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ tab: "payments" });

  if (params.account) {
    query.set("account", params.account);
  }

  redirect(`/dashboard/profile?${query.toString()}`);
}
