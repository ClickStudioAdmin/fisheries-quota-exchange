import type { OrderStatus } from "../orders/types";

export type OrderPayPanel = "checkout" | "pending" | "hidden";

export function orderPayPanel(input: {
  orderStatus: OrderStatus;
  isBuyer: boolean;
  paymentLive: "paid" | "processing" | "unpaid" | "expired";
  paymentStatus: string | null;
  hasPaymentReceivedEvent: boolean;
  returnedFromCheckout: boolean;
}): OrderPayPanel {
  if (input.orderStatus !== "AWAITING_PAYMENT" || !input.isBuyer) {
    return "hidden";
  }

  const paymentRecorded =
    input.paymentLive === "paid" ||
    input.paymentStatus === "PAID" ||
    input.hasPaymentReceivedEvent;
  const debitSubmitted =
    input.paymentLive === "processing" || input.returnedFromCheckout;

  if (paymentRecorded || debitSubmitted) {
    return "pending";
  }

  return "checkout";
}

export function orderPaymentShouldPoll(
  orderStatus: OrderStatus,
  payPanel: OrderPayPanel,
) {
  return orderStatus === "AWAITING_PAYMENT" && payPanel !== "checkout";
}
