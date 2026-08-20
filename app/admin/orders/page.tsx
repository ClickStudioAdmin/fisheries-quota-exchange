import { redirect } from "next/navigation";
import Link from "next/link";
import { startOrderQueueAction } from "@/lib/orders/actions";
import { listAllOrders } from "@/lib/orders/queries";
import {
  isOrderQueueStatus,
  orderQueuePath,
  orderQueueTitle,
  orderStatusLabel,
  parseOrderIds,
  type Order,
} from "@/lib/orders/types";
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import { fisherySelectLabelForName } from "@/lib/fisheries/types";
import { DataTable, DataTableRowExtras } from "@/components/data-table";
import { OrderTableLinks } from "@/components/order-table-links";
import { TableModal } from "@/components/table-modal";
import { ReviewTransferForms } from "@/components/review-transfer-forms";
import { BulkReviewOrdersModal } from "@/components/bulk-review-orders-modal";
import { tableButtonClassName } from "@/components/auth-card";
import { formatTableDate } from "@/lib/format";

export const metadata = {
  title: "Orders",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const query = await searchParams;
  const [orders, fisheries, jurisdictions] = await Promise.all([
    listAllOrders(),
    listFisheries(),
    listJurisdictions(),
  ]);
  const queued = parseOrderIds(query.queue);
  const byId = new Map(orders.map((order) => [order.id, order]));
  const firstQueued = queued
    .map((id) => byId.get(id))
    .find(
      (order): order is Order =>
        order != null && isOrderQueueStatus(order.status),
    );
  const queueStatus = firstQueued?.status;
  const queueOrders = queueStatus
    ? queued
        .map((id) => byId.get(id))
        .filter(
          (order): order is Order =>
            order != null && order.status === queueStatus,
        )
    : [];
  const remainingPath = orderQueuePath(queueOrders.map((order) => order.id));
  const requestedPath = orderQueuePath(queued);

  if (queued.length > 0 && remainingPath !== requestedPath) {
    redirect(remainingPath);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Simulated orders
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Approve compliance, run transfer (Queensland workspace or simulate),
          then simulate settlement. Select orders in the same status to open a
          queue. The buyer pays the listed amount. Settlement Transfers the
          seller’s share after the platform fee, writes SALE/PURCHASE or
          LEASE_OUT/LEASE_IN ledger rows, consumes the reservation, and emails
          dummy tax invoices (quota and platform fee) to the buyer.
        </p>
      </div>
      <DataTable
        caption="Orders"
        empty="No orders yet."
        searchPlaceholder="Filter orders…"
        defaultSort={{ key: "id", direction: "desc" }}
        selectable
        bulkActions={[
          {
            label: "Review",
            action: startOrderQueueAction,
            requireValue: {
              key: "status",
              value: "AWAITING_COMPLIANCE",
            },
            hiddenFields: { expected_status: "AWAITING_COMPLIANCE" },
          },
          {
            label: "Transfer",
            action: startOrderQueueAction,
            requireValue: {
              key: "status",
              value: "AWAITING_TRANSFER",
            },
            hiddenFields: { expected_status: "AWAITING_TRANSFER" },
          },
          {
            label: "Simulate settlement",
            action: startOrderQueueAction,
            requireValue: {
              key: "status",
              value: "AWAITING_SETTLEMENT",
            },
            hiddenFields: { expected_status: "AWAITING_SETTLEMENT" },
          },
        ]}
        columns={[
          { key: "id", header: "ID", sortable: true, details: true, nowrap: true },
          {
            key: "parties",
            header: "Buyer / seller",
            stacked: [
              { key: "buyer", label: "Buyer", filter: "select" },
              { key: "seller", label: "Seller", filter: "select" },
            ],
          },
          {
            key: "offering",
            header: "Offering",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "SALE", label: "Sale" },
              { value: "LEASE", label: "Lease" },
            ],
          },
          {
            key: "fishery",
            header: "Fishery",
            sortable: true,
            filter: "select",
          },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          {
            key: "amount",
            header: "Amount",
            sortable: true,
            align: "right",
            stacked: [
              { key: "amount", label: "Amount" },
              { key: "fee", label: "Fee" },
            ],
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
              { value: "AWAITING_COMPLIANCE", label: "Awaiting compliance" },
              { value: "AWAITING_TRANSFER", label: "Awaiting transfer" },
              { value: "AWAITING_SETTLEMENT", label: "Awaiting settlement" },
              { value: "COMPLETED", label: "Completed" },
              { value: "REJECTED", label: "Rejected" },
              { value: "CANCELLED", label: "Cancelled" },
            ],
          },
        ]}
        rows={orders.map((order) => ({
          id: order.id,
          needsAction:
            order.status === "AWAITING_COMPLIANCE" ||
            order.status === "AWAITING_TRANSFER" ||
            order.status === "AWAITING_SETTLEMENT",
          details: [
            { label: "Created", value: formatTableDate(order.created_at) },
          ],
          values: {
            id: order.id,
            parties: `${order.buyer_name} ${order.seller_name}`,
            buyer: order.buyer_name,
            seller: order.seller_name,
            fishery: fisherySelectLabelForName(
              order.fishery_name,
              fisheries,
              jurisdictions,
            ),
            offering: order.offering,
            quantity: order.quantity,
            amount: order.amount_aud,
            fee: order.fee_amount_aud,
            status: order.status,
            created: order.created_at,
          },
          display: {
            offering: listingOfferingLabel(order.offering),
            quantity: `${order.quantity} ${order.unit_label}`,
            amount: formatAud(order.amount_aud),
            fee:
              Number(order.fee_percent) > 0
                ? `${formatAud(order.fee_amount_aud)} (${order.fee_percent}%)`
                : formatAud(order.fee_amount_aud),
            status: orderStatusLabel(order.status),
          },
        }))}
      >
        {orders.map((order) => (
          <DataTableRowExtras
            key={order.id}
            id={order.id}
            links={<OrderTableLinks orderId={order.id} />}
            actions={
              <>
                {order.status === "AWAITING_COMPLIANCE" ? (
                  <TableModal title="Review compliance" label="Review" wide>
                    <ReviewTransferForms order={order} />
                  </TableModal>
                ) : null}
                {order.status === "AWAITING_TRANSFER" ? (
                  <Link
                    href={`/admin/orders?queue=${order.id}`}
                    className={tableButtonClassName}
                  >
                    Transfer
                  </Link>
                ) : null}
                {order.status === "AWAITING_SETTLEMENT" ? (
                  <ReviewTransferForms order={order} />
                ) : null}
              </>
            }
          />
        ))}
      </DataTable>
      {queueOrders.length > 0 &&
      queueStatus &&
      isOrderQueueStatus(queueStatus) ? (
        <BulkReviewOrdersModal
          title={orderQueueTitle(queueStatus)}
          count={queueOrders.length}
        >
          {queueOrders.map((order, index) => (
            <section
              key={order.id}
              className="space-y-4 py-6 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                  {index + 1} of {queueOrders.length}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-ink">
                  Order {order.id} · {order.buyer_name} / {order.seller_name}
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  {listingOfferingLabel(order.offering)} ·{" "}
                  {fisherySelectLabelForName(
                    order.fishery_name,
                    fisheries,
                    jurisdictions,
                  )}{" "}
                  · {order.quantity} {order.unit_label} ·{" "}
                  {formatAud(order.amount_aud)}
                </p>
              </div>
              <ReviewTransferForms
                order={order}
                reviewQueue={queueOrders.map((item) => item.id)}
              />
            </section>
          ))}
        </BulkReviewOrdersModal>
      ) : null}
    </div>
  );
}
