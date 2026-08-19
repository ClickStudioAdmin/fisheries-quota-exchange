import { redirect } from "next/navigation";

export const metadata = {
  title: "Account details",
};

export default async function DashboardMembersPage() {
  redirect("/dashboard/profile?tab=members");
}
