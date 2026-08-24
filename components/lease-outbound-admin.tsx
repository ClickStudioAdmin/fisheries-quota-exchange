import {
  tableButtonClassName,
} from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ReviewChecklistForm } from "@/components/review-checklist-form";
import { LabeledFields, panelClassName } from "@/components/surface";
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import {
  completeLeaseOutboundAction,
  saveLeaseOutboundChecklistAction,
} from "@/lib/orders/actions";
import { checklistIsComplete } from "@/lib/orders/checklist";
import type { TransferWorkspace } from "@/lib/transfers/queries";

function queueFields(remaining: number[]) {
  return remaining.map((id) => (
    <input key={id} type="hidden" name="review_queue" value={id} />
  ));
}

export function LeaseOutboundAdmin({
  workspace,
  reviewQueue = [],
}: {
  workspace: TransferWorkspace;
  reviewQueue?: number[];
}) {
  const order = workspace.order;
  const remaining = reviewQueue.filter((id) => id !== order.id);
  const fishery = workspace.jurisdictionCode
    ? `${workspace.jurisdictionCode} · ${order.fishery_name}`
    : order.fishery_name;
  const canComplete = checklistIsComplete(
    workspace.process.outboundChecks,
    order.lease_outbound_checklist,
  );

  return (
    <div className="mt-2 min-w-0 space-y-6">
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Order</h3>
          <div className="mt-4">
            <LabeledFields
              items={[
                { label: "Order", value: String(order.id) },
                { label: "Buyer", value: order.buyer_name },
                { label: "Seller", value: order.seller_name },
                {
                  label: "Offering",
                  value: listingOfferingLabel(order.offering),
                },
                { label: "Fishery", value: fishery },
                {
                  label: "Quantity",
                  value: `${order.quantity} ${order.unit_label}`,
                },
                { label: "Amount", value: formatAud(order.amount_aud) },
              ]}
            />
          </div>
        </section>
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">FishNet outbound</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {workspace.process.title}. No FDU1469 or PandaDoc. Complete the
            temporary FishNet transfer from FQX custody to the buyer, then mark
            outbound complete to settle the order.
          </p>
          <div className="mt-4">
            <ReviewChecklistForm
              action={saveLeaseOutboundChecklistAction}
              hidden={{ order_id: String(order.id) }}
              extraHidden={queueFields(remaining)}
              checks={workspace.process.outboundChecks}
              completed={order.lease_outbound_checklist}
              proceedGoal="to complete FishNet outbound"
            />
          </div>
        </section>
      </div>
      <section id="review-decision" className={panelClassName}>
        <h3 className="text-lg font-semibold text-ink">Complete outbound</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Saves ledger moves, consumes the reservation, marks the listing sold,
          and completes settlement. The browser is not trusted.
        </p>
        {!canComplete ? (
          <p className="mt-3 text-sm text-ink-muted">
            Save all outbound checks above before completing.
          </p>
        ) : null}
        <form action={completeLeaseOutboundAction} className="mt-4">
          <input type="hidden" name="order_id" value={order.id} />
          {queueFields(remaining)}
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Completing…"
            disabled={!canComplete}
          >
            Complete FishNet outbound
          </PendingSubmitButton>
        </form>
      </section>
    </div>
  );
}
