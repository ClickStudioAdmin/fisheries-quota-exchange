import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/register-form";
import { isPlatformAdmin } from "@/lib/admin/access";
import { postLoginPath } from "@/lib/auth/paths";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";
import { registrationsAllowed } from "@/lib/settings/queries";

export const metadata = {
  title: "Register",
};

export default async function RegisterPage() {
  const user = await getUser();

  if (user) {
    redirect(postLoginPath(null, await isPlatformAdmin()));
  }

  const configured = getSupabasePublicEnv() !== null;
  const allowRegister = await registrationsAllowed();

  return (
    <AuthCard title="Create account">
      {!configured ? (
        <p className="mb-4 text-sm text-red-800" role="alert">
          Supabase public environment variables are not set for this deployment.
        </p>
      ) : null}
      {allowRegister ? (
        <RegisterForm />
      ) : (
        <p className="text-sm text-ink-muted">
          New registrations are closed. If you already have an account, log in.
        </p>
      )}
      <p className="mt-4 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
