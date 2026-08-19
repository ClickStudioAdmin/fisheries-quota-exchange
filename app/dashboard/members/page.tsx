import { redirect } from "next/navigation";

export const metadata = {
  title: "Account Settings",
};

export default async function DashboardMembersPage() {
  redirect("/dashboard/account?tab=members");
}
