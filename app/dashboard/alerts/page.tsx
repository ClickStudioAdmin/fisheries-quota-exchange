import { redirect } from "next/navigation";

export const metadata = {
  title: "Alerts",
};

export default async function DashboardAlertsPage() {
  redirect("/dashboard/profile?tab=alerts");
}
