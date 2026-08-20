import { tableButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { cancelOrderAction } from "@/lib/orders/actions";
import type { Order } from "@/lib/orders/types";

export function CancelOrderForm({
  order,
}: {
  order: Pick<Order, "id" | "status">;
}) {
  const paid = order.status === "AWAITING_COMPLIANCE";

  return (
    <form action={cancelOrderAction} className="space-y-4">
      <input type="hidden" name="order_id" value={order.id} />
      <input type="hidden" name="next" value="/admin/orders" />
      <p className="text-sm text-ink-muted">
        This cancels the order and releases reserved quota. If the listing has
        not expired, it can return to the market.
        {paid
          ? " A received payment is not refunded."
          : " Unpaid Checkout sessions are expired."}
      </p>
      <PendingSubmitButton
        className={tableButtonClassName}
        pendingLabel="Cancelling…"
      >
        Cancel order
      </PendingSubmitButton>
    </form>
  );
}
