import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Reset password",
};

export default async function ForgotPasswordPage() {
  const user = await getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthCard title="Reset password">
      <p className="mb-4 text-sm text-ink-muted">
        Enter your email and we will send a reset link if an account exists.
      </p>
      <ForgotPasswordForm />
      <p className="mt-4 text-sm text-ink-muted">
        <Link href="/login" className="underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
