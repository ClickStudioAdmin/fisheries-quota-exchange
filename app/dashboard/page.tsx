import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { PageIntro } from "@/components/page-intro";
import { buttonClassName } from "@/components/auth-card";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PageIntro title="Dashboard">
      <p>You are signed in as {user.email}.</p>
      <p>
        Organisation management will be added in a later phase. This page only
        confirms that authentication works.
      </p>
      <form action={logoutAction}>
        <button type="submit" className={buttonClassName}>
          Log out
        </button>
      </form>
    </PageIntro>
  );
}
