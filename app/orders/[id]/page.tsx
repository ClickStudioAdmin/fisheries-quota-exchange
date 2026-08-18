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
import { orderStatusLabel } from "@/lib/orders/types";
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import { LabeledFields, panelClassName } from "@/components/surface";
import { StatusBadge } from "@/components/status-badge";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getMyRole } from "@/lib/organisations/queries";
import { getPaymentForOrder } from "@/lib/payments/queries";
import { getStripePublishableKey } from "@/lib/payments/env";
import { orderChargeAud, orderSellerPayoutAud } from "@/lib/payments/money";
import { reconcileOrderPayment } from "@/lib/payments/reconcile";
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
  const reservationLabel =
    reservation?.status === "ACTIVE"
      ? "Active"
      : reservation?.status === "RELEASED"
        ? "Released"
        : reservation?.status === "CONSUMED"
          ? "Consumed"
          : "None";
  const paymentBadge =
    payment?.status === "PAID"
      ? order.status === "COMPLETED"
        ? { label: "Paid", code: "PAID" }
        : { label: "Held until settlement", code: "held until settlement" }
      : payment?.status === "PENDING" && debitProcessing
        ? { label: "Bank debit processing", code: "bank debit processing" }
        : payment?.status === "PENDING"
          ? { label: "Pending", code: "PENDING" }
          : payment?.status === "EXPIRED"
            ? { label: "Expired", code: "EXPIRED" }
            : payment?.status === "FAILED"
              ? { label: "Failed", code: "FAILED" }
              : { label: "None", code: "none" };
  const transferBadge = payment?.stripe_transfer_id
    ? { label: "Sent at settlement", code: "sent at settlement" }
    : { label: "Not yet", code: "not yet" };
  const settlementBadge =
    transaction?.status === "COMPLETED"
      ? { label: "Completed", code: "COMPLETED" }
      : transaction?.status === "PENDING"
        ? { label: "Pending", code: "PENDING" }
        : { label: "None", code: "none" };
  const feeLabel =
    Number(order.fee_percent) > 0
      ? `${formatAud(order.fee_amount_aud)} (${order.fee_percent}%, ${
          buyerPaidFeeOnTop ? "added to buyer payment" : "deducted from seller"
        })`
      : "None";
  const totalItems = showCommission
    ? [
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
        {
          label: payment?.status === "PAID" ? "You paid" : "You pay",
          value: totalDue,
        },
      ];
  const statusItems = [
    {
      label: "Quota reservation",
      value: (
        <StatusBadge
          label={reservationLabel}
          code={reservation?.status ?? "none"}
        />
      ),
    },
    {
      label: "Payment",
      value: (
        <StatusBadge label={paymentBadge.label} code={paymentBadge.code} />
      ),
    },
    ...(showCommission
      ? [
          {
            label: "Seller transfer",
            value: (
              <StatusBadge
                label={transferBadge.label}
                code={transferBadge.code}
              />
            ),
          },
        ]
      : []),
    {
      label: "Settlement",
      value: (
        <StatusBadge
          label={settlementBadge.label}
          code={settlementBadge.code}
        />
      ),
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
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,38rem)_minmax(0,26rem)]">
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
          <section className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-semibold text-ink">Status</h3>
            <div className="mt-3">
              <LabeledFields items={statusItems} />
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
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">Audit</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No audit events yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            {events.map((event) => (
              <li key={event.id}>
                {event.event_type} ·{" "}
                {new Date(event.created_at).toLocaleString("en-AU")}
                {event.actor_email ? ` · ${event.actor_email}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
