import Link from "next/link";
import { redirect } from "next/navigation";
import {
  approveComplianceAction,
  rejectComplianceAction,
  simulateSettlementAction,
  simulateTransferAction,
} from "@/lib/orders/actions";
import { listAllOrders } from "@/lib/orders/queries";
import { orderStatusLabel } from "@/lib/orders/types";
import { formatAud } from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { buttonClassName, fieldClassName } from "@/components/auth-card";

export const metadata = {
  title: "Orders",
};

export default async function AdminOrdersPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const orders = await listAllOrders();
  const compliance = orders.filter((item) => item.status === "AWAITING_COMPLIANCE");
  const transfer = orders.filter((item) => item.status === "AWAITING_TRANSFER");
  const settlement = orders.filter(
    (item) => item.status === "AWAITING_SETTLEMENT",
  );
  const others = orders.filter(
    (item) =>
      item.status !== "AWAITING_COMPLIANCE" &&
      item.status !== "AWAITING_TRANSFER" &&
      item.status !== "AWAITING_SETTLEMENT",
  );

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Simulated transactions
      </h1>
      <p className="text-sm text-ink-muted">
        No live payment. Approve compliance, simulate transfer, then simulate
        settlement. Settlement writes SALE/PURCHASE or LEASE_OUT/LEASE_IN
        ledger rows and consumes the reservation.
      </p>
      <section>
        <h2 className="text-xl font-semibold text-ink">Compliance review</h2>
        {compliance.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No orders waiting.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {compliance.map((order) => (
              <div key={order.id} className="border border-line p-4">
                <p className="font-medium text-ink">
                  Order {order.id} · {order.buyer_name} buying from{" "}
                  {order.seller_name}
                </p>
                <p className="text-sm text-ink-muted">
                  {order.offering} · {order.quantity} {order.unit_label} ·{" "}
                  {formatAud(order.amount_aud)}
                </p>
                <p className="mt-1 text-sm">
                  <Link href={`/orders/${order.id}`} className="underline">
                    View order
                  </Link>
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <form action={approveComplianceAction} className="flex gap-2">
                    <input type="hidden" name="order_id" value={order.id} />
                    <input
                      name="review_note"
                      placeholder="Note (optional)"
                      className={fieldClassName}
                    />
                    <button type="submit" className={buttonClassName}>
                      Approve
                    </button>
                  </form>
                  <form action={rejectComplianceAction} className="flex gap-2">
                    <input type="hidden" name="order_id" value={order.id} />
                    <input
                      name="review_note"
                      placeholder="Reason (optional)"
                      className={fieldClassName}
                    />
                    <button
                      type="submit"
                      className="border border-line px-4 py-2 text-sm text-ink hover:bg-paper-raised"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">Transfer simulation</h2>
        {transfer.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No orders waiting.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {transfer.map((order) => (
              <li
                key={order.id}
                className="flex flex-col gap-3 border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-ink">
                    Order {order.id} · {order.quantity} {order.unit_label}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {order.buyer_name} · {formatAud(order.amount_aud)}
                  </p>
                </div>
                <form action={simulateTransferAction}>
                  <input type="hidden" name="order_id" value={order.id} />
                  <button type="submit" className={buttonClassName}>
                    Simulate transfer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">Settlement simulation</h2>
        {settlement.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No orders waiting.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {settlement.map((order) => (
              <li
                key={order.id}
                className="flex flex-col gap-3 border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-ink">
                    Order {order.id} · {order.offering} · {order.quantity}{" "}
                    {order.unit_label}
                  </p>
                  <p className="text-sm text-ink-muted">
                    Writes quota ledger rows. No money moves.
                  </p>
                </div>
                <form action={simulateSettlementAction}>
                  <input type="hidden" name="order_id" value={order.id} />
                  <button type="submit" className={buttonClassName}>
                    Simulate settlement
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">Other orders</h2>
        {others.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            {others.map((order) => (
              <li key={order.id}>
                <Link href={`/orders/${order.id}`} className="underline">
                  Order {order.id}
                </Link>{" "}
                · {orderStatusLabel(order.status)} · {order.buyer_name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
