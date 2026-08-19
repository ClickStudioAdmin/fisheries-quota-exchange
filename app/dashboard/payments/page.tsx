import { redirect } from "next/navigation";

export const metadata = {
  title: "Account details",
};

export default async function DashboardPaymentsPage() {
  redirect("/dashboard/profile?tab=payments");
}
