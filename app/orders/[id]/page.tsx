import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderCheckout } from "@/components/order-checkout";
import { OrderCheckoutStatus } from "@/components/order-checkout-status";
import { OrderPaymentPoll } from "@/components/order-payment-poll";
import { PdfDownloadLink } from "@/components/pdf-download-link";
import {
  getOrder,
  getReservationForOrder,
  getTransactionForOrder,
  listOrderAuditEvents,
} from "@/lib/orders/queries";
import { auditActorLabel, auditEventLabel } from "@/lib/audit/types";
import { orderStatusLabel } from "@/lib/orders/types";
import { buildOrderSteps } from "@/lib/orders/progress";
import { formatAud, formatAudPerUnit, listingOfferingLabel } from "@/lib/listings/types";
import { LabeledFields, panelClassName } from "@/components/surface";
import { StatusBadge } from "@/components/status-badge";
import { OrderProgress } from "@/components/order-progress";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getActiveOrganisation } from "@/lib/organisations/active-session";
import { listAuditPersonNames } from "@/lib/audit/queries";
import { getMyRole, getOrganisationLegalName } from "@/lib/organisations/queries";
import { canBuyForOrganisation, canEditOrganisation } from "@/lib/organisations/permissions";
import { SwitchAccountNotice } from "@/components/switch-account-notice";
import { getPaymentForOrder } from "@/lib/payments/queries";
import { getStripePublishableKey } from "@/lib/payments/env";
import {
  buyerCardFeeAud,
  orderChargeAud,
  orderSellerPayoutAud,
  stripeCardFeeAud,
  stripeCardFeeRateLabel,
} from "@/lib/payments/money";
import { orderPayPanel } from "@/lib/payments/order-pay-panel";
import { reconcileOrderPayment } from "@/lib/payments/reconcile";
import { formatTableDateTime } from "@/lib/format";
import { latestComplianceUpdateNotes } from "@/lib/orders/compliance-update";
import { accountSettingsPath } from "@/lib/organisations/paths";
import { loginPath } from "@/lib/auth/paths";
import { getUser } from "@/lib/supabase/server";
import { taxInvoicePath } from "@/lib/invoices/types";
import { getTransferWorkspace } from "@/lib/transfers/queries";
import { transferDocumentPath } from "@/lib/transfers/types";
import { TransferOrderPanel } from "@/components/transfer-order-panel";
import { SuccessNotice } from "@/components/notices";
import { ViewMessageModal } from "@/components/view-message-modal";

export const metadata = {
  title: "Order",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; pay?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getUser();

  if (!user) {
    redirect(loginPath(`/orders/${id}`));
  }
  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    notFound();
  }

  let order = await getOrder(orderId);

  if (!order) {
    notFound();
  }

  let paymentLive: Awaited<ReturnType<typeof reconcileOrderPayment>> = "unpaid";

  if (order.status === "AWAITING_PAYMENT") {
    paymentLive = await reconcileOrderPayment(order.id);
    order = (await getOrder(orderId)) ?? order;
  }

  const [reservation, transaction, events, buyerRole, sellerRole, admin, payment, active, transferWorkspace] =
    await Promise.all([
      getReservationForOrder(order.id),
      getTransactionForOrder(order.id),
      listOrderAuditEvents(order.id),
      getMyRole(order.buyer_organisation_id),
      getMyRole(order.seller_organisation_id),
      isPlatformAdmin(),
      getPaymentForOrder(order.id),
      getActiveOrganisation(),
      order.status === "AWAITING_TRANSFER" ||
      order.status === "AWAITING_SETTLEMENT" ||
      order.status === "COMPLETED"
        ? getTransferWorkspace(order.id)
        : Promise.resolve(null),
    ]);

  const isBuyer = Boolean(active) && active?.id === order.buyer_organisation_id;
  const isSeller = Boolean(active) && active?.id === order.seller_organisation_id;
  const viewingOrgId = admin ? null : active?.id ?? null;
  const personNames = await listAuditPersonNames(viewingOrgId);
  const actorContext = {
    viewer: admin ? ("admin" as const) : ("business" as const),
    organisationId: viewingOrgId,
    organisationName: isBuyer
      ? order.buyer_name
      : isSeller
        ? order.seller_name
        : null,
    personNames,
  };
  const canPay =
    isBuyer && active != null && canBuyForOrganisation(active.role);
  const canPrepareTransfer =
    Boolean(admin) ||
    (active != null &&
      (isBuyer || isSeller) &&
      canEditOrganisation(active.role));
  const involvedIds = [
    buyerRole ? order.buyer_organisation_id : null,
    sellerRole ? order.seller_organisation_id : null,
  ].filter((id): id is number => id != null);

  if (!admin && involvedIds.length === 0) {
    notFound();
  }

  if (
    !admin &&
    active &&
    active.id !== order.buyer_organisation_id &&
    active.id !== order.seller_organisation_id
  ) {
    const switchId = involvedIds[0];
    const switchName =
      (await getOrganisationLegalName(switchId)) ?? "that business";
    return (
      <SwitchAccountNotice
        organisationId={switchId}
        organisationName={switchName}
        next={`/orders/${order.id}`}
      />
    );
  }
  const showCommission = isSeller || (Boolean(admin) && !isBuyer);
  const hasPaymentReceivedEvent = events.some(
    (event) => event.event_type === "PAYMENT_RECEIVED",
  );
  const paymentRecorded =
    paymentLive === "paid" ||
    payment?.status === "PAID" ||
    hasPaymentReceivedEvent;

  const payPanel = orderPayPanel({
    orderStatus: order.status,
    isBuyer: canPay,
    paymentLive,
    paymentStatus: payment?.status ? String(payment.status) : null,
    hasPaymentReceivedEvent,
    returnedFromCheckout: query.paid === "1",
  });
  const showCheckout = payPanel === "checkout";
  const showPending = payPanel === "pending";
  const updateNotes = latestComplianceUpdateNotes(events);
  const showBuyerUpdate = Boolean(updateNotes.buyer) && (admin || isBuyer);
  const showSellerUpdate = Boolean(updateNotes.seller) && (admin || isSeller);
  const publishableKey = showCheckout ? getStripePublishableKey() : null;
  const listedDue = formatAud(order.amount_aud);
  const cardDue = formatAud(orderChargeAud(order.amount_aud));
  const paidAmount =
    payment?.status === "PAID" ? formatAud(payment.amount_aud) : null;
  const cardFeeAud =
    payment?.status === "PAID"
      ? buyerCardFeeAud(
          order.amount_aud,
          order.fee_amount_aud,
          payment.amount_aud,
        )
      : stripeCardFeeAud(order.amount_aud);
  const sellerProceeds = formatAud(
    orderSellerPayoutAud(
      order.amount_aud,
      order.fee_amount_aud,
      payment?.status === "PAID" ? payment.amount_aud : order.amount_aud,
    ),
  );
  const progressSteps = buildOrderSteps({
    orderStatus: order.status,
    reservationStatus: reservation?.status ?? null,
    paymentStatus: payment?.status ? String(payment.status) : null,
    paymentConfirming: showPending,
    settlementCompleted: transaction?.status === "COMPLETED",
    usesSimulatedTransfer: transferWorkspace?.process.usesSimulatedTransfer,
    transferApplicationStatus: transferWorkspace?.application?.status ?? null,
  });
  const feeLabel =
    Number(order.fee_percent) > 0
      ? `${formatAud(order.fee_amount_aud)} (${order.fee_percent}%)`
      : "None";
  const unitPriceItem = {
    label: "Price",
    value: formatAudPerUnit(order.unit_price_aud, order.unit_label),
  };
  const quotaItem = {
    label: isSeller ? "Listed amount" : "Quota amount",
    value: formatAud(order.amount_aud),
  };
  const unpaidCardItem =
    !paidAmount && cardFeeAud > 0
      ? {
          label: showCommission ? "If buyer pays by card" : "If you pay by card",
          value: `${cardDue} (includes Stripe ${stripeCardFeeRateLabel()})`,
        }
      : null;
  const totalItems = showCommission
    ? [
        unitPriceItem,
        quotaItem,
        { label: "Platform fee", value: feeLabel },
        {
          label: isSeller ? "You receive" : "Seller proceeds",
          value: sellerProceeds,
        },
        ...(isSeller
          ? []
          : [
              {
                label: paidAmount ? "Buyer paid" : "Buyer pays",
                value: paidAmount ?? listedDue,
              },
              ...(unpaidCardItem ? [unpaidCardItem] : []),
            ]),
      ]
    : [
        unitPriceItem,
        quotaItem,
        {
          label: paidAmount ? "You paid" : "You pay",
          value: paidAmount ?? listedDue,
        },
        ...(unpaidCardItem ? [unpaidCardItem] : []),
      ];

  return (
    <div>
      {showPending ? <OrderPaymentPoll /> : null}
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        {showCheckout ? "Checkout" : `Order ${order.id}`}
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-ink-muted">
        {showCheckout ? `Order ${order.id}` : null}
        <StatusBadge
          label={orderStatusLabel(
            order.status,
            transferWorkspace
              ? {
                  usesSimulatedTransfer:
                    transferWorkspace.process.usesSimulatedTransfer,
                  applicationStatus: transferWorkspace.application?.status ?? null,
                }
              : null,
          )}
          code={order.status}
        />
      </p>
      {query.pay === "cancelled" ? (
        <p className="mt-3 text-sm text-ink-muted">
          Payment was not completed. The quota is still reserved until you pay.
        </p>
      ) : null}
      {query.pay === "setup" ? (
        <p className="mt-3 text-sm text-ink-muted">
          The order was reserved. Complete payment below.
        </p>
      ) : null}
      <section className={`mt-6 ${panelClassName}`}>
        <h2 className="text-sm font-semibold text-ink">Status</h2>
        <div className="mt-4">
          <OrderProgress steps={progressSteps} />
        </div>
      </section>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
        <div className={panelClassName}>
          <h2 className="text-lg font-semibold text-ink">Order summary</h2>
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-ink">Listing details</h3>
            <div className="mt-3">
              <LabeledFields
                items={[
                  {
                    label: "Listing",
                    value: (
                      <Link
                        href={`/marketplace/${order.listing_id}`}
                        className="underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {order.fishery_name}
                      </Link>
                    ),
                  },
                  { label: "Offering", value: listingOfferingLabel(order.offering) },
                  { label: "Seller", value: order.seller_name },
                  { label: "Buyer", value: order.buyer_name },
                  {
                    label: "Quantity",
                    value: `${order.quantity} ${order.unit_label}`,
                  },
                ]}
              />
            </div>
          </section>
          <section className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-semibold text-ink">Totals</h3>
            <div className="mt-3">
              <LabeledFields items={totalItems} />
            </div>
          </section>
        </div>
        {showPending ? (
          <div className={panelClassName}>
            <h2 className="text-lg font-semibold text-ink">Pay FQX</h2>
            <div className="mt-6">
              <OrderCheckoutStatus
                title={
                  paymentRecorded
                    ? "Confirming payment"
                    : "Bank debit processing"
                }
              >
                {paymentRecorded
                  ? "Payment was recorded. This page will update when the order moves to compliance."
                  : "Your bank debit was submitted. Stripe may show Incoming until it clears. This page will update when payment is confirmed."}
              </OrderCheckoutStatus>
            </div>
          </div>
        ) : showCheckout && publishableKey ? (
          <div className={panelClassName}>
            <h2 className="text-lg font-semibold text-ink">Pay FQX</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Choose bank debit or an Australian-issued card, then pay in
              Stripe test mode. Bank debit charges the listed amount. Card adds
              Stripe&apos;s processing fee ({stripeCardFeeRateLabel()}) so FQX
              receives the quota price. Cards issued outside Australia are
              declined. The platform fee is deducted from the seller. Bank
              debit is only offered up to A$10,000. FQX holds the funds until
              settlement, then pays the seller.
            </p>
            <div className="mt-6">
              <OrderCheckout
                orderId={order.id}
                publishableKey={publishableKey}
                listedAud={order.amount_aud}
                cardAud={String(orderChargeAud(order.amount_aud))}
              />
            </div>
          </div>
        ) : showCheckout ? (
          <p className="text-sm text-ink-muted">
            Payments are not configured, so this order cannot be charged yet.
          </p>
        ) : order.status === "AWAITING_COMPLIANCE" ? (
          <SuccessNotice title="Payment received">
            {isSeller
              ? "FQX is holding the funds until settlement. Next, FQX reviews the order. Payout is at settlement, not now."
              : "FQX is holding the funds until settlement. Next, FQX reviews the order. We'll email you if anything needs updating."}
          </SuccessNotice>
        ) : order.status === "AWAITING_TRANSFER" &&
          transferWorkspace &&
          !transferWorkspace.process.usesSimulatedTransfer ? (
          <div className={panelClassName}>
            <TransferOrderPanel
              workspace={transferWorkspace}
              viewerOrganisationId={active?.id ?? null}
              canPrepare={canPrepareTransfer}
            />
          </div>
        ) : order.status === "AWAITING_SETTLEMENT" ? (
          <div className={panelClassName}>
            <h2 className="text-lg font-semibold text-ink">Settlement</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {transferWorkspace &&
              !transferWorkspace.process.usesSimulatedTransfer
                ? "Fisheries Queensland has approved the transfer. "
                : "The transfer is recorded. "}
              FQX is settling this order: quota moves on the ledger, then the
              seller is paid their net proceeds, then dummy tax invoices are
              issued. You do not need to do anything.
            </p>
            {transferWorkspace?.application?.fq_reference ? (
              <p className="mt-2 text-sm text-ink-muted">
                Fisheries Queensland reference:{" "}
                {transferWorkspace.application.fq_reference}
              </p>
            ) : null}
            {transferWorkspace?.latestSignedPack ? (
              <div className="mt-4 flex max-w-lg flex-col gap-2">
                <PdfDownloadLink
                  href={transferDocumentPath(
                    order.id,
                    transferWorkspace.latestSignedPack.id,
                  )}
                  hint={
                    transferWorkspace.latestSignedPack.original_filename ??
                    "Signed application"
                  }
                >
                  Download signed application
                </PdfDownloadLink>
              </div>
            ) : null}
          </div>
        ) : order.status === "COMPLETED" ? (
          <div className={panelClassName}>
            <h2 className="text-lg font-semibold text-ink">Documents</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {transferWorkspace?.latestSignedPack
                ? "The signed application is the pack lodged with Fisheries Queensland. "
                : null}
              Dummy invoices from simulated settlement. GST is not calculated.
              These are not real tax invoices. The quota invoice is from the
              seller to the buyer. The fee invoice is from FQX to the seller.
            </p>
            <div className="mt-4 flex max-w-lg flex-col gap-2">
              {transferWorkspace?.latestSignedPack ? (
                <PdfDownloadLink
                  href={transferDocumentPath(
                    order.id,
                    transferWorkspace.latestSignedPack.id,
                  )}
                  hint={
                    transferWorkspace.latestSignedPack.original_filename ??
                    "Signed application"
                  }
                >
                  Download signed application
                </PdfDownloadLink>
              ) : null}
              <PdfDownloadLink
                href={taxInvoicePath(order.id, "quota")}
                hint="Seller to buyer · Dummy invoice"
              >
                Download quota invoice
              </PdfDownloadLink>
              <PdfDownloadLink
                href={taxInvoicePath(order.id, "fee")}
                hint="FQX to seller · Dummy invoice"
              >
                Download fee invoice
              </PdfDownloadLink>
            </div>
          </div>
        ) : null}
      </div>
      {order.review_note ? (
        <p className="mt-6 text-sm text-ink-muted">Note: {order.review_note}</p>
      ) : null}
      {showBuyerUpdate || showSellerUpdate ? (
        <section className={`mt-6 ${panelClassName}`}>
          <h2 className="text-sm font-semibold text-ink">
            Update requested
          </h2>
          <div className="mt-3 space-y-4 text-sm text-ink">
            {showBuyerUpdate ? (
              <div>
                <p className="text-ink-muted">
                  {admin || !isBuyer
                    ? `Buyer · ${order.buyer_name}`
                    : "FQX asked you to update this order."}
                </p>
                <div className="mt-2">
                  <ViewMessageModal
                    title="Update requested"
                    quote={updateNotes.buyer}
                  />
                </div>
                {isBuyer && !admin ? (
                  <p className="mt-2">
                    <Link href={accountSettingsPath()} className="underline">
                      Business Settings → Details
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}
            {showSellerUpdate ? (
              <div>
                <p className="text-ink-muted">
                  {admin || !isSeller
                    ? `Seller · ${order.seller_name}`
                    : "FQX asked you to update this order."}
                </p>
                <div className="mt-2">
                  <ViewMessageModal
                    title="Update requested"
                    quote={updateNotes.seller}
                  />
                </div>
                {isSeller && !admin ? (
                  <p className="mt-2">
                    <Link href={accountSettingsPath()} className="underline">
                      Business Settings → Details
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
      <section className={`mt-8 ${panelClassName}`}>
        <h2 className="text-sm font-semibold text-ink">Activity</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No events yet.</p>
        ) : (
          <ol className="mt-4 divide-y divide-line">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-ink">
                  {auditEventLabel(event.event_type)}
                  <span className="text-ink-muted">
                    {" "}
                    · {auditActorLabel(event, actorContext)}
                  </span>
                </span>
                <time
                  className="shrink-0 text-xs text-ink-muted"
                  dateTime={event.created_at}
                >
                  {formatTableDateTime(event.created_at)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
