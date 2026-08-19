import { redirect } from "next/navigation";

export const metadata = {
  title: "Business Settings",
};

export default async function DashboardPaymentsPage() {
  redirect("/dashboard/account?tab=payments");
}
