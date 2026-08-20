import { ReviewOrderForms } from "@/components/review-order-forms";
import { QldTransferAdmin } from "@/components/qld-transfer-admin";
import type { Order } from "@/lib/orders/types";
import { getTransferWorkspace } from "@/lib/transfers/queries";

export async function ReviewTransferForms({
  order,
  reviewQueue = [],
}: {
  order: Pick<Order, "id" | "status">;
  reviewQueue?: number[];
}) {
  if (order.status !== "AWAITING_TRANSFER") {
    return <ReviewOrderForms order={order} reviewQueue={reviewQueue} />;
  }

  const workspace = await getTransferWorkspace(order.id);

  if (!workspace || workspace.process.usesSimulatedTransfer) {
    return <ReviewOrderForms order={order} reviewQueue={reviewQueue} />;
  }

  return <QldTransferAdmin workspace={workspace} reviewQueue={reviewQueue} />;
}
