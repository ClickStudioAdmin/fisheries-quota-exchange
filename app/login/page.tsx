import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { safeNextPath } from "@/lib/auth/paths";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";
import { registrationsAllowed } from "@/lib/settings/queries";

export const metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ? safeNextPath(params.next) : "/dashboard";
  const user = await getUser();

  if (user) {
    redirect(next);
  }

  const configured = getSupabasePublicEnv() !== null;
  const allowRegister = await registrationsAllowed();

  return (
    <AuthCard title="Log in">
      {!configured ? (
        <p className="text-sm text-red-800" role="alert">
          Supabase public environment variables are not set for this deployment.
        </p>
      ) : null}
      {params.error ? (
        <p className="mb-4 text-sm text-red-800" role="alert">
          Sign-in could not be completed. Try again.
        </p>
      ) : null}
      <LoginForm next={next === "/dashboard" ? undefined : next} />
      <p className="mt-4 text-sm text-ink-muted">
        <Link href="/forgot-password" className="underline">
          Forgot password
        </Link>
      </p>
      {allowRegister ? (
        <p className="mt-2 text-sm text-ink-muted">
          No account?{" "}
          <Link href="/register" className="underline">
            Register
          </Link>
        </p>
      ) : null}
    </AuthCard>
  );
}
