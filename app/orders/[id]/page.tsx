import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelOrderAction } from "@/lib/orders/actions";
import { OrderCheckout } from "@/components/order-checkout";
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
import { orderChargeAud, orderSellerPayoutAud } from "@/lib/payments/money";
import { reconcileOrderPayment } from "@/lib/payments/reconcile";
import { formatTableDateTime } from "@/lib/format";
import { loginPath } from "@/lib/auth/paths";
import { getUser } from "@/lib/supabase/server";

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

  const canCancel =
    (order.status === "AWAITING_COMPLIANCE" ||
      order.status === "AWAITING_PAYMENT") &&
    (admin || buyerRole !== null);
  const debitProcessing =
    order.status === "AWAITING_PAYMENT" && paymentLive === "processing";
  const canPay =
    order.status === "AWAITING_PAYMENT" &&
    buyerRole !== null &&
    !debitProcessing;
  const publishableKey = canPay ? getStripePublishableKey() : null;
  const totalDue = formatAud(
    payment?.status === "PAID"
      ? payment.amount_aud
      : orderChargeAud(order.amount_aud),
  );
  const sellerProceeds = formatAud(
    orderSellerPayoutAud(
      order.amount_aud,
      order.fee_amount_aud,
      payment?.status === "PAID" ? payment.amount_aud : order.amount_aud,
    ),
  );
  const buyerPaidFeeOnTop =
    payment?.status === "PAID" &&
    Number(payment.amount_aud) > Number(order.amount_aud);
  const progressSteps = buildOrderSteps({
    orderStatus: order.status,
    reservationStatus: reservation?.status ?? null,
    paymentStatus: payment?.status ? String(payment.status) : null,
    debitProcessing,
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
  const totalItems = showCommission
    ? [
        unitPriceItem,
        {
          label: isSeller ? "Listed amount" : "Quota amount",
          value: formatAud(order.amount_aud),
        },
        { label: "Platform fee", value: feeLabel },
        {
          label: isSeller ? "You receive" : "Seller proceeds",
          value: sellerProceeds,
        },
        ...(isSeller
          ? []
          : [
              {
                label:
                  payment?.status === "PAID" ? "Buyer paid" : "Buyer pays",
                value: totalDue,
              },
            ]),
      ]
    : [
        unitPriceItem,
        {
          label: payment?.status === "PAID" ? "You paid" : "You pay",
          value: totalDue,
        },
      ];

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        {canPay ? "Checkout" : `Order ${order.id}`}
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-ink-muted">
        {canPay ? `Order ${order.id}` : null}
        <StatusBadge
          label={orderStatusLabel(order.status)}
          code={order.status}
        />
      </p>
      {query.paid === "1" && order.status === "AWAITING_PAYMENT" ? (
        <p className="mt-3 text-sm text-ink-muted">
          If you paid by bank debit, Stripe may show Incoming while the debit
          clears. Refresh this page — FQX checks Stripe on the server, not
          this URL.
        </p>
      ) : null}
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
        {debitProcessing ? (
          <div className={panelClassName}>
            <h2 className="text-lg font-semibold text-ink">Pay FQX</h2>
            <p className="mt-2 text-sm text-ink-muted">
              The bank debit was submitted. Stripe may show the funds as
              Incoming until they clear. FQX will mark this order paid when
              Stripe confirms the debit — refresh this page.
            </p>
          </div>
        ) : canPay && publishableKey ? (
          <div className={panelClassName}>
            <h2 className="text-lg font-semibold text-ink">Pay FQX</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Pay by card or Australian bank debit (BECS) in Stripe test mode.
              Stripe only shows BECS when the charge is within your account’s
              debit limit (A$10,000 by default). FQX holds the funds until
              settlement, then pays the seller.
            </p>
            <div className="mt-6">
              <OrderCheckout
                orderId={order.id}
                publishableKey={publishableKey}
              />
            </div>
          </div>
        ) : canPay ? (
          <p className="text-sm text-ink-muted">
            Payments are not configured, so this order cannot be charged yet.
          </p>
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
