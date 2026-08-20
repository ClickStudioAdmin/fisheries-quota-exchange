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
  const compliance = steps.find((step) => step.id === "compliance");
  const transfer = steps.find((step) => step.id === "transfer");
  const settlement = steps.find((step) => step.id === "settlement");

  assert.equal(payment?.state, "done");
  assert.equal(payment?.detail, "Held until settlement");
  assert.equal(compliance?.label, "Compliance");
  assert.equal(compliance?.state, "current");
  assert.equal(compliance?.detail, "Awaiting review");
  assert.equal(transfer?.label, "Transfer");
  assert.equal(transfer?.state, "upcoming");
  assert.equal(settlement?.state, "upcoming");
});

test("transfer is current after compliance, before settlement", () => {
  const steps = buildOrderSteps({
    orderStatus: "AWAITING_TRANSFER",
    reservationStatus: "ACTIVE",
    paymentStatus: "PAID",
  });
  const compliance = steps.find((step) => step.id === "compliance");
  const transfer = steps.find((step) => step.id === "transfer");
  const settlement = steps.find((step) => step.id === "settlement");

  assert.equal(compliance?.state, "done");
  assert.equal(compliance?.detail, "Approved");
  assert.equal(transfer?.state, "current");
  assert.equal(transfer?.detail, "In progress");
  assert.equal(settlement?.state, "upcoming");
  assert.equal(settlement?.detail, "Waiting");
});

test("Queensland transfer step uses the application sub-status", () => {
  const steps = buildOrderSteps({
    orderStatus: "AWAITING_TRANSFER",
    reservationStatus: "ACTIVE",
    paymentStatus: "PAID",
    usesSimulatedTransfer: false,
    transferApplicationStatus: "AWAITING_SIGNED_PACK",
  });
  const transfer = steps.find((step) => step.id === "transfer");

  assert.equal(transfer?.state, "current");
  assert.equal(transfer?.detail, "Waiting for signed documents");
});

test("settlement is current only after transfer", () => {
  const steps = buildOrderSteps({
    orderStatus: "AWAITING_SETTLEMENT",
    reservationStatus: "ACTIVE",
    paymentStatus: "PAID",
  });
  const transfer = steps.find((step) => step.id === "transfer");
  const settlement = steps.find((step) => step.id === "settlement");

  assert.equal(transfer?.state, "done");
  assert.equal(transfer?.detail, "Complete");
  assert.equal(settlement?.state, "current");
  assert.equal(settlement?.detail, "In progress");
});

test("completed orders mark every step done", () => {
  const steps = buildOrderSteps({
    orderStatus: "COMPLETED",
    reservationStatus: "CONSUMED",
    paymentStatus: "PAID",
    settlementCompleted: true,
  });

  assert.deepEqual(
    steps.map((step) => [step.id, step.state]),
    [
      ["quota_reserved", "done"],
      ["payment", "done"],
      ["compliance", "done"],
      ["transfer", "done"],
      ["settlement", "done"],
    ],
  );
});

test("rejected orders fail compliance and leave transfer waiting", () => {
  const steps = buildOrderSteps({
    orderStatus: "REJECTED",
    reservationStatus: "RELEASED",
    paymentStatus: "PAID",
  });
  const compliance = steps.find((step) => step.id === "compliance");
  const transfer = steps.find((step) => step.id === "transfer");
  const settlement = steps.find((step) => step.id === "settlement");

  assert.equal(compliance?.state, "failed");
  assert.equal(compliance?.detail, "Rejected");
  assert.equal(transfer?.state, "upcoming");
  assert.equal(settlement?.state, "upcoming");
});
