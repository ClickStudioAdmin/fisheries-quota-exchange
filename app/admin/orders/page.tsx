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
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  fieldClassName,
  tableButtonClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { TableModal } from "@/components/table-modal";
import { formatTableDate } from "@/lib/format";

export const metadata = {
  title: "Orders",
};

export default async function AdminOrdersPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const orders = await listAllOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Simulated orders
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          No live payment. Approve compliance, simulate transfer, then simulate
          settlement. Settlement writes SALE/PURCHASE or LEASE_OUT/LEASE_IN
          ledger rows and consumes the reservation.
        </p>
      </div>
      <DataTable
        caption="Orders"
        empty="No orders yet."
        searchPlaceholder="Filter orders…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "Order", sortable: true },
          { key: "buyer", header: "Buyer", sortable: true, filter: "select" },
          { key: "seller", header: "Seller", sortable: true, filter: "select" },
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
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          { key: "amount", header: "Amount", sortable: true, align: "right" },
          { key: "created", header: "Created", sortable: true },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
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
          values: {
            id: order.id,
            buyer: order.buyer_name,
            seller: order.seller_name,
            offering: order.offering,
            quantity: order.quantity,
            amount: order.amount_aud,
            status: order.status,
            created: order.created_at,
          },
          display: {
            offering: listingOfferingLabel(order.offering),
            quantity: `${order.quantity} ${order.unit_label}`,
            amount: formatAud(order.amount_aud),
            status: orderStatusLabel(order.status),
            created: formatTableDate(order.created_at),
          },
        }))}
      >
        {orders.map((order) => (
          <DataTableRowExtras
            key={order.id}
            id={order.id}
            links={
              <Link
                href={`/orders/${order.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={tableLinkClassName}
              >
                View
              </Link>
            }
            actions={
              <>
                {order.status === "AWAITING_COMPLIANCE" ? (
                  <TableModal title="Review compliance" label="Review">
                    <div className="space-y-4">
                      <form
                        id={`approve-compliance-${order.id}`}
                        action={approveComplianceAction}
                      >
                        <input type="hidden" name="order_id" value={order.id} />
                        <button type="submit" className={tableButtonClassName}>
                          Approve
                        </button>
                      </form>
                      <form action={rejectComplianceAction} className="space-y-3">
                        <input type="hidden" name="order_id" value={order.id} />
                        <div>
                          <label
                            htmlFor={`reject-note-${order.id}`}
                            className="block text-sm text-ink"
                          >
                            Reason (optional)
                          </label>
                          <input
                            id={`reject-note-${order.id}`}
                            name="review_note"
                            className={fieldClassName}
                          />
                        </div>
                        <button
                          type="submit"
                          className={tableSecondaryButtonClassName}
                        >
                          Reject
                        </button>
                      </form>
                      <div>
                        <label
                          htmlFor={`approve-note-${order.id}`}
                          className="block text-sm text-ink"
                        >
                          Note (optional)
                        </label>
                        <input
                          id={`approve-note-${order.id}`}
                          name="review_note"
                          form={`approve-compliance-${order.id}`}
                          className={fieldClassName}
                        />
                      </div>
                    </div>
                  </TableModal>
                ) : null}
                {order.status === "AWAITING_TRANSFER" ? (
                  <form action={simulateTransferAction}>
                    <input type="hidden" name="order_id" value={order.id} />
                    <button type="submit" className={tableButtonClassName}>
                      Simulate transfer
                    </button>
                  </form>
                ) : null}
                {order.status === "AWAITING_SETTLEMENT" ? (
                  <form action={simulateSettlementAction}>
                    <input type="hidden" name="order_id" value={order.id} />
                    <button type="submit" className={tableButtonClassName}>
                      Simulate settlement
                    </button>
                  </form>
                ) : null}
              </>
            }
          />
        ))}
      </DataTable>
    </div>
  );
}
