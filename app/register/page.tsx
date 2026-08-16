import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/register-form";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Register",
};

export default async function RegisterPage() {
  const user = await getUser();

  if (user) {
    redirect("/dashboard");
  }

  const configured = getSupabasePublicEnv() !== null;

  return (
    <AuthCard title="Create account">
      {!configured ? (
        <p className="mb-4 text-sm text-red-800" role="alert">
          Supabase public environment variables are not set for this deployment.
        </p>
      ) : null}
      <RegisterForm />
      <p className="mt-4 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
