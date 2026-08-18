import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderSteps } from "./progress.ts";

test("payment step stays current with Confirming while the server catches up", () => {
  const [reserved, payment] = buildOrderSteps({
    orderStatus: "AWAITING_PAYMENT",
    reservationStatus: "ACTIVE",
    paymentStatus: "PENDING",
    paymentConfirming: true,
  });

  assert.equal(reserved?.state, "done");
  assert.equal(payment?.state, "current");
  assert.equal(payment?.detail, "Confirming");
});

test("payment step is done and held once the order is awaiting compliance", () => {
  const steps = buildOrderSteps({
    orderStatus: "AWAITING_COMPLIANCE",
    reservationStatus: "ACTIVE",
    paymentStatus: "PAID",
  });
  const payment = steps.find((step) => step.id === "payment");

  assert.equal(payment?.state, "done");
  assert.equal(payment?.detail, "Held until settlement");
});
