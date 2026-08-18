import Link from "next/link";
import { displayName } from "@/lib/auth/display-name";
import { listHoldingsForOrganisation } from "@/lib/fisheries/queries";
import { holdingIsVerified } from "@/lib/fisheries/types";
import { listOrganisationListings } from "@/lib/listings/queries";
import { listingIsOpen } from "@/lib/listings/types";
import { listOrganisationOrders } from "@/lib/orders/queries";
import { orderStatusLabel } from "@/lib/orders/types";
import { accountPath } from "@/lib/organisations/paths";
import { getOrganisation } from "@/lib/organisations/queries";
import { organisationRoleLabel } from "@/lib/organisations/types";
import { organisationCanSellError } from "@/lib/payments/sell-access";
import { LabeledFields, panelClassName, statClassName } from "@/components/surface";
import type { User } from "@supabase/supabase-js";

const OPEN_ORDER_STATUSES = new Set([
  "AWAITING_PAYMENT",
  "AWAITING_COMPLIANCE",
  "AWAITING_TRANSFER",
  "AWAITING_SETTLEMENT",
]);

export async function AccountOverviewSection({
  organisationId,
  user,
}: {
  organisationId: number;
  user: User;
}) {
  const result = await getOrganisation(organisationId);

  if (!result) {
    return <p>Account not found.</p>;
  }

  const [holdings, listings, orders, sellError] = await Promise.all([
    listHoldingsForOrganisation(organisationId),
    listOrganisationListings(organisationId),
    listOrganisationOrders(organisationId),
    organisationCanSellError(organisationId),
  ]);
  const pendingHoldings = holdings.filter(
    (holding) => !holdingIsVerified(holding),
  ).length;
  const pendingListings = listings.filter(
    (listing) => listing.status === "PENDING_APPROVAL",
  ).length;
  const liveListings = listings.filter(
    (listing) => listing.status === "PUBLISHED",
  ).length;
  const activeListings = listings.filter(listingIsOpen).length;
  const openOrders = orders.filter((order) =>
    OPEN_ORDER_STATUSES.has(order.status),
  );
  const payOrders = orders.filter((order) => order.status === "AWAITING_PAYMENT");
  const href = (path: string) => accountPath(organisationId, path);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Overview
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Welcome back, {displayName(user)}.
        </p>
      </div>
      <div className={panelClassName}>
        <LabeledFields
          items={[
            {
              label: "Account",
              value: result.organisation.legal_name,
            },
            {
              label: "Your role",
              value: organisationRoleLabel(result.role),
            },
            {
              label: "Selling",
              value: sellError ? "Stripe setup needed" : "Ready to list",
            },
          ]}
        />
        {sellError ? (
          <p className="mt-4 text-sm text-ink-muted">
            {sellError}{" "}
            <Link href={href("/dashboard/payments")} className="underline">
              Go to Payments
            </Link>
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={href("/dashboard/holdings")} className={statClassName}>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            Holdings
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{holdings.length}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {pendingHoldings > 0
              ? `${pendingHoldings} waiting for verification`
              : "All verified"}
          </p>
        </Link>
        <Link href={href("/dashboard/listings")} className={statClassName}>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            Listings
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">{activeListings}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {pendingListings > 0
              ? `${pendingListings} waiting for approval`
              : `${liveListings} live on the marketplace`}
          </p>
        </Link>
        <Link href={href("/dashboard/orders")} className={statClassName}>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            Open orders
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {openOrders.length}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {payOrders.length > 0
              ? `${payOrders.length} awaiting payment`
              : "None awaiting payment"}
          </p>
        </Link>
      </div>
      {openOrders.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-ink">Needs attention</h2>
          <ul className="space-y-2">
            {openOrders.slice(0, 5).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="text-sm underline"
                >
                  Order {order.id} · {order.fishery_name} ·{" "}
                  {orderStatusLabel(order.status)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
