import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { CreateOrganisationForm } from "@/components/create-organisation-form";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Create organisation",
};

export default async function NewOrganisationPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthCard title="Create organisation">
      <p className="mb-4 text-sm text-ink-muted">
        You will be the owner of this organisation.
      </p>
      <CreateOrganisationForm />
      <p className="mt-4 text-sm text-ink-muted">
        <Link href="/dashboard" className="underline">
          Back to dashboard
        </Link>
      </p>
    </AuthCard>
  );
}
