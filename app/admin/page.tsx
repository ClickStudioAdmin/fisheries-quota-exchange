import { buttonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { claimFirstAdminAction } from "@/lib/fisheries/actions";
import { isPlatformAdmin, platformAdminCount } from "@/lib/admin/access";
import { listFisheries, listAllHoldings } from "@/lib/fisheries/queries";

export const metadata = {
  title: "Admin",
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
          role can create test fisheries and quota holdings.
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

  const fisheries = await listFisheries();
  const holdings = await listAllHoldings();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Admin</h1>
      <p className="text-ink-muted">
        {fisheries.length} fisheries · {holdings.length} quota holdings
      </p>
      <p className="text-sm text-ink-muted">
        Create reference data, a fishery, then a holding. Creating a holding
        writes an immutable INITIAL_ALLOCATION ledger row. Quota is not assumed
        to be weight. Simulated purchases are on Orders.
      </p>
    </div>
  );
}
