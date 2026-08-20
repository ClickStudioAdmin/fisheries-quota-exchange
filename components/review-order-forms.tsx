import {
  fieldClassName,
  tableButtonClassName,
} from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  approveComplianceAction,
  rejectComplianceAction,
  simulateSettlementAction,
  simulateTransferAction,
} from "@/lib/orders/actions";
import { RequestComplianceUpdateForm } from "@/components/request-compliance-update-form";
import type { Order } from "@/lib/orders/types";

export function ReviewOrderForms({
  order,
  reviewQueue = [],
  canApprove = false,
}: {
  order: Pick<Order, "id" | "status" | "buyer_name" | "seller_name">;
  reviewQueue?: number[];
  canApprove?: boolean;
}) {
  const remaining = reviewQueue.filter((id) => id !== order.id);

  function queueFields() {
    return remaining.map((id) => (
      <input key={id} type="hidden" name="review_queue" value={id} />
    ));
  }

  if (order.status === "AWAITING_COMPLIANCE") {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <form action={approveComplianceAction} className="space-y-3">
            <input type="hidden" name="order_id" value={order.id} />
            {queueFields()}
            <h4 className="text-sm font-semibold text-ink">Approve</h4>
            <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
              <li>Moves this order to the transfer step.</li>
              <li>Emails buyer and seller that transfer has started.</li>
              <li>Does not move quota. The reservation stays until settlement.</li>
              <li>The optional note is stored on the order. It is not emailed.</li>
            </ul>
            {!canApprove ? (
              <p className="text-sm text-ink-muted">
                Save all compliance checks above before you can approve.
              </p>
            ) : null}
            <div>
              <label
                htmlFor={`approve-note-${order.id}`}
                className="block text-sm text-ink"
              >
                Note (optional)
              </label>
              <textarea
                id={`approve-note-${order.id}`}
                name="review_note"
                rows={3}
                className={fieldClassName}
              />
            </div>
            <PendingSubmitButton
              className={tableButtonClassName}
              pendingLabel="Approving…"
              disabled={!canApprove}
            >
              Approve
            </PendingSubmitButton>
          </form>
          <form action={rejectComplianceAction} className="space-y-3">
            <input type="hidden" name="order_id" value={order.id} />
            {queueFields()}
            <h4 className="text-sm font-semibold text-ink">Reject</h4>
            <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
              <li>Cancels this order and sets it to rejected.</li>
              <li>Releases the quota reservation back to the seller.</li>
              <li>Emails buyer and seller. Does not refund payment.</li>
              <li>If you add a reason, both parties receive the same text.</li>
            </ul>
            <div>
              <label
                htmlFor={`reject-note-${order.id}`}
                className="block text-sm text-ink"
              >
                Reason (optional)
              </label>
              <textarea
                id={`reject-note-${order.id}`}
                name="review_note"
                rows={3}
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
        </div>
        <RequestComplianceUpdateForm
          orderId={order.id}
          buyerName={order.buyer_name}
          sellerName={order.seller_name}
        />
      </div>
    );
  }

  if (order.status === "AWAITING_TRANSFER") {
    return (
      <form action={simulateTransferAction}>
        <input type="hidden" name="order_id" value={order.id} />
        {queueFields()}
        <PendingSubmitButton
          className={tableButtonClassName}
          pendingLabel="Simulating…"
        >
          Simulate transfer
        </PendingSubmitButton>
      </form>
    );
  }

  if (order.status === "AWAITING_SETTLEMENT") {
    return (
      <form action={simulateSettlementAction}>
        <input type="hidden" name="order_id" value={order.id} />
        {queueFields()}
        <PendingSubmitButton
          className={tableButtonClassName}
          pendingLabel="Settling…"
        >
          Simulate settlement
        </PendingSubmitButton>
      </form>
    );
  }

  return null;
}
