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
import type { Order } from "@/lib/orders/types";

export function ReviewOrderForms({
  order,
  reviewQueue = [],
}: {
  order: Pick<Order, "id" | "status">;
  reviewQueue?: number[];
}) {
  const remaining = reviewQueue.filter((id) => id !== order.id);

  function queueFields() {
    return remaining.map((id) => (
      <input key={id} type="hidden" name="review_queue" value={id} />
    ));
  }
  const approveFormId = `approve-compliance-${order.id}`;

  if (order.status === "AWAITING_COMPLIANCE") {
    return (
      <div className="space-y-4">
        <form id={approveFormId} action={approveComplianceAction}>
          <input type="hidden" name="order_id" value={order.id} />
          {queueFields()}
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Approving…"
          >
            Approve
          </PendingSubmitButton>
        </form>
        <form action={rejectComplianceAction} className="space-y-3">
          <input type="hidden" name="order_id" value={order.id} />
          {queueFields()}
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
            form={approveFormId}
            className={fieldClassName}
          />
        </div>
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
