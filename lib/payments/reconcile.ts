import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { getPaymentProvider } from "@/lib/payments/provider";
import { getPaymentForOrder } from "@/lib/payments/queries";
import { getOrderForSystem } from "@/lib/orders/queries";
import { notifyPaymentReceived } from "@/lib/email/events";
import { revalidateOrderSurfaces } from "@/lib/orders/revalidate";

export type OrderPaymentLiveStatus = "paid" | "processing" | "unpaid" | "expired";

export async function reconcileOrderPayment(
  orderId: number,
): Promise<OrderPaymentLiveStatus> {
  const payment = await getPaymentForOrder(orderId);
  const sessionId = payment?.checkout_session_id
    ? String(payment.checkout_session_id)
    : null;
  const provider = getPaymentProvider();
  const supabase = createServiceClient();

  if (!sessionId || !provider || !supabase) {
    return "unpaid";
  }

  const live = await provider.getCheckoutPaymentStatus(sessionId).catch(() => null);

  if (!live) {
    return "unpaid";
  }

  const succeeded =
    live.paymentStatus === "paid" ||
    live.paymentStatus === "no_payment_required" ||
    live.paymentIntentStatus === "succeeded";

  if (succeeded) {
    const { error } = await supabase.rpc("mark_order_paid", {
      p_order_id: orderId,
      p_checkout_session_id: sessionId,
      p_payment_intent_id: live.paymentIntentId,
    });

    if (error) {
      console.error("reconcile mark_order_paid failed", error.message);
      return "unpaid";
    }

    const order = await getOrderForSystem(orderId);
    if (order) {
      await notifyPaymentReceived(order);
    }

    revalidateOrderSurfaces(orderId);
    return "paid";
  }

  if (live.status === "expired") {
    return "expired";
  }

  if (
    live.status === "complete" ||
    live.paymentIntentStatus === "processing" ||
    live.paymentIntentStatus === "requires_action"
  ) {
    return "processing";
  }

  return "unpaid";
}
