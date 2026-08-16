import { AuthCard } from "@/components/auth-card";
import { UpdatePasswordForm } from "@/components/update-password-form";

export const metadata = {
  title: "Update password",
};

export default function UpdatePasswordPage() {
  return (
    <AuthCard title="Update password">
      <p className="mb-4 text-sm text-ink-muted">
        Choose a new password for your FQX account.
      </p>
      <UpdatePasswordForm />
    </AuthCard>
  );
}
