import { buttonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { AdminOverviewSection } from "@/components/admin-overview";
import { claimFirstAdminAction } from "@/lib/fisheries/actions";
import { isPlatformAdmin, platformAdminCount } from "@/lib/admin/access";

export const metadata = {
  title: "Overview",
};

export default async function AdminPage() {
  const admin = await isPlatformAdmin();
  const count = await platformAdminCount();

  if (!admin && count === 0) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Become platform admin
        </h1>
        <p className="text-ink-muted">
          No platform admin exists yet. The first signed-in user to claim this
          role can manage users, holdings, listings, orders, and reference
          data.
        </p>
        <form action={claimFirstAdminAction}>
          <PendingSubmitButton
            className={buttonClassName}
            pendingLabel="Claiming…"
          >
            Claim platform admin
          </PendingSubmitButton>
        </form>
      </div>
    );
  }

  if (!admin) {
    return <p>You are not a platform admin.</p>;
  }

  return <AdminOverviewSection />;
}
