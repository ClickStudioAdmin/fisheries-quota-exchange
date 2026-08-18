import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelOrderAction } from "@/lib/orders/actions";
import { OrderCheckout } from "@/components/order-checkout";
import { OrderCheckoutStatus } from "@/components/order-checkout-status";
import { OrderPaymentPoll } from "@/components/order-payment-poll";
import { buttonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  getOrder,
  getReservationForOrder,
  getTransactionForOrder,
  listOrderAuditEvents,
} from "@/lib/orders/queries";
import { auditEventLabel, orderStatusLabel } from "@/lib/orders/types";
import { buildOrderSteps } from "@/lib/orders/progress";
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import { LabeledFields, panelClassName } from "@/components/surface";
import { StatusBadge } from "@/components/status-badge";
import { OrderProgress } from "@/components/order-progress";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getMyRole } from "@/lib/organisations/queries";
import { getPaymentForOrder } from "@/lib/payments/queries";
import { getStripePublishableKey } from "@/lib/payments/env";
import {
  buyerCardFeeAud,
  buyerPaidPlatformFeeOnTop,
  orderChargeAud,
  orderSellerPayoutAud,
  stripeCardFeeAud,
  stripeCardFeeRateLabel,
} from "@/lib/payments/money";
import { orderPayPanel } from "@/lib/payments/order-pay-panel";
import { reconcileOrderPayment } from "@/lib/payments/reconcile";
import { formatTableDateTime } from "@/lib/format";
import { loginPath } from "@/lib/auth/paths";
import { getUser } from "@/lib/supabase/server";
import { taxInvoicePath } from "@/lib/invoices/types";

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

  const [reservation, transaction, events, buyerRole, sellerRole, admin, payment] =
    await Promise.all([
      getReservationForOrder(order.id),
      getTransactionForOrder(order.id),
      listOrderAuditEvents(order.id),
      getMyRole(order.buyer_organisation_id),
      getMyRole(order.seller_organisation_id),
      isPlatformAdmin(),
      getPaymentForOrder(order.id),
    ]);

  const isBuyer = buyerRole !== null;
  const isSeller = sellerRole !== null;
  const showCommission = isSeller || (Boolean(admin) && !isBuyer);
  const hasPaymentReceivedEvent = events.some(
    (event) => event.event_type === "PAYMENT_RECEIVED",
  );
  const paymentRecorded =
    paymentLive === "paid" ||
    payment?.status === "PAID" ||
    hasPaymentReceivedEvent;

  const canCancel =
    (order.status === "AWAITING_COMPLIANCE" ||
      order.status === "AWAITING_PAYMENT") &&
    (admin || buyerRole !== null);
  const payPanel = orderPayPanel({
    orderStatus: order.status,
    isBuyer,
    paymentLive,
    paymentStatus: payment?.status ? String(payment.status) : null,
    hasPaymentReceivedEvent,
    returnedFromCheckout: query.paid === "1",
  });
  const showCheckout = payPanel === "checkout";
  const showPending = payPanel === "pending";
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
  const buyerPaidFeeOnTop =
    payment?.status === "PAID" &&
    buyerPaidPlatformFeeOnTop(
      order.amount_aud,
      order.fee_amount_aud,
      payment.amount_aud,
    );
  const progressSteps = buildOrderSteps({
    orderStatus: order.status,
    reservationStatus: reservation?.status ?? null,
    paymentStatus: payment?.status ? String(payment.status) : null,
    paymentConfirming: showPending,
    settlementCompleted: transaction?.status === "COMPLETED",
  });
  const feeLabel =
    Number(order.fee_percent) > 0
      ? `${formatAud(order.fee_amount_aud)} (${order.fee_percent}%, ${
          buyerPaidFeeOnTop ? "added to buyer payment" : "deducted from seller"
        })`
      : "None";
  const unitPriceItem = {
    label: `Price per ${order.unit_label}`,
    value: formatAud(order.unit_price_aud),
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
          label={orderStatusLabel(order.status)}
          code={order.status}
        />
      </p>
      {query.pay === "cancelled" ? (
        <p className="mt-3 text-sm text-ink-muted">
          Payment was not completed. The quota is still reserved until you pay
          or cancel the order.
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
                  { label: "Type", value: listingOfferingLabel(order.offering) },
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
          {canCancel ? (
            <form action={cancelOrderAction} className="mt-6">
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="next" value={`/orders/${order.id}`} />
              <PendingSubmitButton
                className={buttonClassName}
                pendingLabel="Cancelling…"
              >
                Cancel order
              </PendingSubmitButton>
            </form>
          ) : null}
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
              Stripe's processing fee ({stripeCardFeeRateLabel()}) so FQX
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
        ) : order.status === "COMPLETED" ? (
          <div className={panelClassName}>
            <h2 className="text-lg font-semibold text-ink">Tax invoices</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Dummy invoices from simulated settlement. GST is not calculated.
              These are not real tax invoices. The quota invoice is from the
              seller to the buyer. The fee invoice is from FQX to the seller.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={taxInvoicePath(order.id, "quota")}
                className={`${buttonClassName} inline-block`}
              >
                Download quota invoice
              </a>
              <a
                href={taxInvoicePath(order.id, "fee")}
                className={`${buttonClassName} inline-block`}
              >
                Download fee invoice
              </a>
            </div>
          </div>
        ) : null}
      </div>
      {order.review_note ? (
        <p className="mt-6 text-sm text-ink-muted">Note: {order.review_note}</p>
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
