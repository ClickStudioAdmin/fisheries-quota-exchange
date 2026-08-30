import { redirect } from "next/navigation";

export const metadata = {
  title: "Business Settings",
};

export default async function DashboardMembersPage() {
  redirect("/dashboard/account?tab=members");
}
