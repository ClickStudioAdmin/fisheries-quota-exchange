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
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import { fisherySelectLabelForName } from "@/lib/fisheries/types";
import { fieldClassName, tableButtonClassName } from "@/components/auth-card";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TableModal } from "@/components/table-modal";
import { formatTableDate } from "@/lib/format";

export const metadata = {
  title: "Orders",
};

export default async function AdminOrdersPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const [orders, fisheries, jurisdictions] = await Promise.all([
    listAllOrders(),
    listFisheries(),
    listJurisdictions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Simulated orders
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          No live payment. Approve compliance, simulate transfer, then simulate
          settlement. Settlement writes SALE/PURCHASE or LEASE_OUT/LEASE_IN
          ledger rows, consumes the reservation, and emails a dummy tax invoice
          to the buyer.
        </p>
      </div>
      <DataTable
        caption="Orders"
        empty="No orders yet."
        searchPlaceholder="Filter orders…"
        defaultSort={{ key: "id", direction: "desc" }}
        selectable
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
                        <PendingSubmitButton
                          className={tableButtonClassName}
                          pendingLabel="Approving…"
                        >
                          Approve
                        </PendingSubmitButton>
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
                        <PendingSubmitButton
                          className={tableButtonClassName}
                          pendingLabel="Rejecting…"
                        >
                          Reject
                        </PendingSubmitButton>
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
                    <PendingSubmitButton
                      className={tableButtonClassName}
                      pendingLabel="Simulating…"
                    >
                      Simulate transfer
                    </PendingSubmitButton>
                  </form>
                ) : null}
                {order.status === "AWAITING_SETTLEMENT" ? (
                  <form action={simulateSettlementAction}>
                    <input type="hidden" name="order_id" value={order.id} />
                    <PendingSubmitButton
                      className={tableButtonClassName}
                      pendingLabel="Settling…"
                    >
                      Simulate settlement
                    </PendingSubmitButton>
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
