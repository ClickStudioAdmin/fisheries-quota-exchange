import Link from "next/link";
import { LabeledFields, panelClassName, statClassName } from "@/components/surface";
import { getAdminActionCounts } from "@/lib/nav/action-counts";
import { listFisheries } from "@/lib/fisheries/queries";
import { listOrganisationsForAdmin } from "@/lib/organisations/admin-queries";
import { listAdminQueueOrders } from "@/lib/orders/queries";
import { orderStatusLabel } from "@/lib/orders/types";
import { getPlatformSettings } from "@/lib/settings/queries";
import { formatFeePercent } from "@/lib/settings/types";
import { isPaymentsConfigured } from "@/lib/payments/env";

export async function AdminOverviewSection() {
  const [counts, settings, fisheries, organisations, queueOrders] =
    await Promise.all([
      getAdminActionCounts(),
      getPlatformSettings(),
      listFisheries(),
      listOrganisationsForAdmin(),
      listAdminQueueOrders(),
    ]);
  const paymentsOn = isPaymentsConfigured();
  const unpaidOrders = Math.max(0, counts.orders - queueOrders.length);
  const hasQueue =
    counts.holdings > 0 || counts.listings > 0 || queueOrders.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Overview
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Verify holdings, approve listings, and run compliance, transfer, and
          settlement on orders. The buyer pays the listed amount; the platform
          fee comes from the seller. Card payments use Stripe test mode and
          Australian-issued cards.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/holdings" className={statClassName}>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            Holdings
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{counts.holdings}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {counts.holdings === 0 ? "None waiting" : "Waiting for verification"}
          </p>
        </Link>
        <Link href="/admin/listings" className={statClassName}>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            Listings
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{counts.listings}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {counts.listings === 0 ? "None waiting" : "Waiting for approval"}
          </p>
        </Link>
        <Link href="/admin/orders" className={statClassName}>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            Orders
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {queueOrders.length}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {unpaidOrders > 0
              ? `${unpaidOrders} awaiting payment`
              : queueOrders.length > 0
                ? "Compliance, transfer, or settlement"
                : "None waiting on admin"}
          </p>
        </Link>
      </div>
      {hasQueue ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-ink">Needs attention</h2>
          <ul className="space-y-2">
            {counts.holdings > 0 ? (
              <li>
                <Link href="/admin/holdings" className="text-sm underline">
                  {counts.holdings === 1
                    ? "1 holding waiting for verification"
                    : `${counts.holdings} holdings waiting for verification`}
                </Link>
              </li>
            ) : null}
            {counts.listings > 0 ? (
              <li>
                <Link href="/admin/listings" className="text-sm underline">
                  {counts.listings === 1
                    ? "1 listing waiting for approval"
                    : `${counts.listings} listings waiting for approval`}
                </Link>
              </li>
            ) : null}
            {queueOrders.slice(0, 8).map((order) => (
              <li key={order.id}>
                <Link href={`/orders/${order.id}`} className="text-sm underline">
                  Order {order.id} · {order.fishery_name} ·{" "}
                  {orderStatusLabel(order.status)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-ink-muted">
          Nothing in the admin queues. New holdings, listings, and paid orders
          will show here.
        </p>
      )}
      <div className={panelClassName}>
        <h2 className="text-lg font-semibold text-ink">Platform</h2>
        <div className="mt-4">
          <LabeledFields
            columns={3}
            items={[
              {
                label: "Registrations",
                value: settings.allow_registrations ? "Open" : "Closed",
              },
              {
                label: "Auto-approve holdings",
                value: settings.auto_approve_holdings ? "On for verified users" : "Off",
              },
              {
                label: "Auto-approve listings",
                value: settings.auto_approve_listings ? "On for verified users" : "Off",
              },
              {
                label: "Sale fee",
                value: `${formatFeePercent(settings.sale_fee_percent)}, seller pays`,
              },
              {
                label: "Lease fee",
                value: `${formatFeePercent(settings.lease_fee_percent)}, seller pays`,
              },
              {
                label: "Payments",
                value: paymentsOn ? "Stripe test mode" : "Simulated (no Stripe keys)",
              },
              {
                label: "Fisheries",
                value: String(fisheries.length),
              },
              {
                label: "Businesses",
                value: String(organisations.length),
              },
            ]}
          />
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          <Link href="/admin/settings" className="underline">
            Platform settings
          </Link>
          {" · "}
          <Link href="/admin/reference/fisheries" className="underline">
            Fisheries
          </Link>
          {" · "}
          <Link href="/admin/templates" className="underline">
            Email templates
          </Link>
        </p>
      </div>
    </div>
  );
}
