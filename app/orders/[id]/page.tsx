import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelOrderAction } from "@/lib/orders/actions";
import { buttonClassName } from "@/components/auth-card";
import {
  getOrder,
  getReservationForOrder,
  getTransactionForOrder,
  listOrderAuditEvents,
} from "@/lib/orders/queries";
import { orderStatusLabel } from "@/lib/orders/types";
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import { LabeledFields, panelClassName } from "@/components/surface";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getMyRole } from "@/lib/organisations/queries";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Order",
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    notFound();
  }

  const order = await getOrder(orderId);

  if (!order) {
    notFound();
  }

  const [reservation, transaction, events, buyerRole, admin] = await Promise.all([
    getReservationForOrder(order.id),
    getTransactionForOrder(order.id),
    listOrderAuditEvents(order.id),
    getMyRole(order.buyer_organisation_id),
    isPlatformAdmin(),
  ]);

  const canCancel =
    order.status === "AWAITING_COMPLIANCE" && (admin || buyerRole !== null);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Order {order.id}
      </h1>
      <p className="mt-2 text-ink-muted">{orderStatusLabel(order.status)}</p>
      <div className={`mt-8 max-w-lg ${panelClassName}`}>
        <LabeledFields
          items={[
            {
              label: "Listing",
              value: (
                <Link href={`/marketplace/${order.listing_id}`} className="underline">
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
            { label: "Simulated amount", value: formatAud(order.amount_aud) },
            {
              label: "Platform fee",
              value:
                Number(order.fee_percent) > 0
                  ? `${formatAud(order.fee_amount_aud)} (${order.fee_percent}%)`
                  : "None",
            },
            {
              label: "Quota reservation",
              value: reservation?.status ?? "None",
            },
            {
              label: "Settlement simulation",
              value: transaction?.status ?? "None",
            },
          ]}
        />
      </div>
      {order.review_note ? (
        <p className="mt-6 text-sm text-ink-muted">Note: {order.review_note}</p>
      ) : null}
      {canCancel ? (
        <form action={cancelOrderAction} className="mt-6">
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="next" value={`/orders/${order.id}`} />
          <button
            type="submit"
            className={buttonClassName}
          >
            Cancel order
          </button>
        </form>
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
