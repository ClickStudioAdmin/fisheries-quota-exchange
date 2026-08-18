import assert from "node:assert/strict";
import test from "node:test";
import { orderPayPanel } from "./order-pay-panel.ts";

const awaiting = {
  orderStatus: "AWAITING_PAYMENT" as const,
  isBuyer: true,
  paymentLive: "unpaid" as const,
  paymentStatus: "PENDING" as const,
  hasPaymentReceivedEvent: false,
  returnedFromCheckout: false,
};

test("checkout when the buyer can still start Stripe", () => {
  assert.equal(orderPayPanel(awaiting), "checkout");
});

test("pending when Stripe reports the debit is processing", () => {
  assert.equal(
    orderPayPanel({ ...awaiting, paymentLive: "processing" }),
    "pending",
  );
});

test("pending when Stripe has paid but the order row has not moved", () => {
  assert.equal(orderPayPanel({ ...awaiting, paymentLive: "paid" }), "pending");
});

test("pending when the payment row is PAID and the order is still awaiting payment", () => {
  assert.equal(
    orderPayPanel({ ...awaiting, paymentStatus: "PAID" }),
    "pending",
  );
});

test("pending when activity already has Payment received", () => {
  assert.equal(
    orderPayPanel({ ...awaiting, hasPaymentReceivedEvent: true }),
    "pending",
  );
});

test("pending after Checkout return while the server catches up", () => {
  assert.equal(
    orderPayPanel({ ...awaiting, returnedFromCheckout: true }),
    "pending",
  );
});

test("hidden once the order has moved to compliance", () => {
  assert.equal(
    orderPayPanel({
      ...awaiting,
      orderStatus: "AWAITING_COMPLIANCE",
      paymentLive: "paid",
      paymentStatus: "PAID",
      hasPaymentReceivedEvent: true,
    }),
    "hidden",
  );
});

test("hidden for a seller viewing an unpaid order", () => {
  assert.equal(orderPayPanel({ ...awaiting, isBuyer: false }), "hidden");
});
