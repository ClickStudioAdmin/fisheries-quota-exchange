import Link from "next/link";
import { displayName } from "@/lib/auth/display-name";
import { MyInvitationList } from "@/components/invitation-lists";
import {
  listFisheries,
  listHoldingsForOrganisation,
  listJurisdictions,
} from "@/lib/fisheries/queries";
import { holdingIsVerified } from "@/lib/fisheries/types";
import { listOrganisationListings } from "@/lib/listings/queries";
import { listingIsOpen } from "@/lib/listings/types";
import { listMyInAppNotifications } from "@/lib/notifications/queries";
import {
  listLatestComplianceUpdateNotesByOrderIds,
  listOrganisationOrders,
} from "@/lib/orders/queries";
import {
  orderPaymentActionIsDue,
  organisationNeedsAttentionItems,
} from "@/lib/organisations/needs-attention";
import { accountPaymentsPath } from "@/lib/organisations/paths";
import { getOrganisation, listMyPendingInvitations } from "@/lib/organisations/queries";
import { canBuyForOrganisation } from "@/lib/organisations/permissions";
import { listTransferApplicationsByOrderIds } from "@/lib/transfers/queries";
import { organisationCanSellError } from "@/lib/payments/sell-access";
import { listPaymentStatusesByOrderIds } from "@/lib/payments/queries";
import { hasAcceptedCurrentTerms } from "@/lib/terms/queries";
import { AcceptTermsForm } from "@/components/accept-terms-form";
import { OverviewNotifications } from "@/components/overview-notifications";
import { NavBadge } from "@/components/nav-badge";
import { PaymentsSetupNotice } from "@/components/payments-setup-notice";
import { StatusBadge } from "@/components/status-badge";
import { ActionNotice } from "@/components/notices";
import { BusinessDetailsRequiredNotice } from "@/components/business-details-required-notice";
import {
  missingBusinessDetailFields,
  tradeReadyFieldLabels,
} from "@/lib/organisations/completeness";
import {
  LabeledFields,
  panelClassName,
  statClassName,
} from "@/components/surface";
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
  organisationId: number | null;
  user: User;
}) {
  const result = organisationId ? await getOrganisation(organisationId) : null;
  const acceptedTerms = await hasAcceptedCurrentTerms();
  const [holdings, listings, orders, sellError, notifications, invitations, fisheries, jurisdictions] =
    await Promise.all([
      organisationId
        ? listHoldingsForOrganisation(organisationId)
        : Promise.resolve([] as Awaited<ReturnType<typeof listHoldingsForOrganisation>>),
      organisationId
        ? listOrganisationListings(organisationId)
        : Promise.resolve([] as Awaited<ReturnType<typeof listOrganisationListings>>),
      organisationId
        ? listOrganisationOrders(organisationId)
        : Promise.resolve([] as Awaited<ReturnType<typeof listOrganisationOrders>>),
      organisationId ? organisationCanSellError(organisationId) : Promise.resolve(null),
      listMyInAppNotifications(10),
      listMyPendingInvitations(),
      organisationId ? listFisheries() : Promise.resolve([]),
      organisationId ? listJurisdictions() : Promise.resolve([]),
    ]);
  const hasAccount = Boolean(result);
  const detailsMissing = result
    ? missingBusinessDetailFields(result.organisation)
    : [];
  const detailsComplete = detailsMissing.length === 0;
  const canManage = result ? canBuyForOrganisation(result.role) : false;
  const canBuy = acceptedTerms && hasAccount && canManage && detailsComplete;
  const canSell = canBuy && !sellError;
  const href = (path: string) => path;
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
  const [transferApplications, complianceNotes, paymentStatusByOrderId] =
    organisationId
      ? await Promise.all([
          canManage
            ? listTransferApplicationsByOrderIds(
                orders
                  .filter((order) => order.status === "AWAITING_TRANSFER")
                  .map((order) => order.id),
              )
            : Promise.resolve(
                new Map<number, { process_code: string; status: string }>(),
              ),
          canManage
            ? listLatestComplianceUpdateNotesByOrderIds(
                orders
                  .filter((order) => order.status === "AWAITING_COMPLIANCE")
                  .map((order) => order.id),
              )
            : Promise.resolve(
                new Map<number, { buyer: string | null; seller: string | null }>(),
              ),
          listPaymentStatusesByOrderIds(
            orders
              .filter((order) => order.status === "AWAITING_PAYMENT")
              .map((order) => order.id),
          ),
        ])
      : [
          new Map<number, { process_code: string; status: string }>(),
          new Map<number, { buyer: string | null; seller: string | null }>(),
          new Map<number, string>(),
        ];
  const payOrders = orders.filter((order) =>
    orderPaymentActionIsDue(
      order.status,
      paymentStatusByOrderId.get(order.id),
    ),
  );
  const needsAttention = organisationNeedsAttentionItems({
    organisationId: organisationId ?? 0,
    canManage,
    orders,
    listings,
    transferByOrderId: transferApplications,
    fisheries,
    jurisdictions,
    complianceNotesByOrderId: complianceNotes,
    paymentStatusByOrderId,
  });
  const cardLinkClassName = `${statClassName} transition-colors hover:border-sea`;

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
      <MyInvitationList invitations={invitations} />
      <div className={panelClassName}>
        <h2 className="text-lg font-semibold text-ink">Onboarding</h2>
        <div className="mt-4">
          <LabeledFields
            items={[
              {
                label: "Eligible to buy",
                value: <StatusBadge label={canBuy ? "Yes" : "Not yet"} />,
              },
              {
                label: "Eligible to sell",
                value: <StatusBadge label={canSell ? "Yes" : "Not yet"} />,
              },
            ]}
          />
        </div>
        <div className="mt-4 space-y-3">
          {acceptedTerms ? null : <AcceptTermsForm />}
          {hasAccount ? (
            acceptedTerms && detailsMissing.length > 0 ? (
              <>
                <p className="text-sm text-ink-muted">
                  You have agreed to the{" "}
                  <Link href="/terms" className="underline">
                    terms of service
                  </Link>
                  .
                </p>
                <BusinessDetailsRequiredNotice
                  action="trade"
                  missingLabels={tradeReadyFieldLabels(detailsMissing)}
                />
              </>
            ) : acceptedTerms && sellError ? (
              <>
                <p className="text-sm text-ink-muted">
                  You have agreed to the{" "}
                  <Link href="/terms" className="underline">
                    terms of service
                  </Link>
                  .
                </p>
                <PaymentsSetupNotice href={accountPaymentsPath(organisationId)}>
                  Before you can be eligible to list quota for sale, provide
                  your payment details on the Payments tab of Business Settings.
                </PaymentsSetupNotice>
              </>
            ) : acceptedTerms ? (
              <p className="text-sm text-ink-muted">
                You have agreed to the{" "}
                <Link href="/terms" className="underline">
                  terms of service
                </Link>
                .
              </p>
            ) : null
          ) : (
            <ActionNotice
              title="Add business details"
              href="/dashboard/account"
              actionLabel="Go to Business Settings"
            >
              Add your business details on Business Settings before you can buy
              or list quota.
            </ActionNotice>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Link href={href("/dashboard/holdings")} className={cardLinkClassName}>
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
        <Link href={href("/dashboard/listings")} className={cardLinkClassName}>
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
        <Link href={href("/dashboard/orders")} className={cardLinkClassName}>
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
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewNotifications notifications={notifications} />
        </div>
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
            Needs attention
            <NavBadge count={needsAttention.length} />
          </h2>
          <div className={panelClassName}>
            {needsAttention.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nothing needs your action right now.
              </p>
            ) : (
              <ul className="-mx-5 -my-5 divide-y divide-line">
                {needsAttention.map((item) => (
                  <li key={item.key} className="px-5 py-4">
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    {item.detail ? (
                      <p className="mt-1 text-sm text-ink-muted">{item.detail}</p>
                    ) : null}
                    <Link
                      href={item.href}
                      className="mt-2 inline-block text-sm underline"
                    >
                      {item.actionLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
