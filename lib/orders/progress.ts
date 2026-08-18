import type { OrderStatus } from "@/lib/orders/types";

export type OrderStepId =
  | "quota_reserved"
  | "payment"
  | "compliance"
  | "settlement";

export type OrderStepState = "done" | "current" | "upcoming" | "failed";

export type OrderStep = {
  id: OrderStepId;
  label: string;
  state: OrderStepState;
  detail: string;
};

const LABELS: Record<OrderStepId, string> = {
  quota_reserved: "Quota reserved",
  payment: "Payment",
  compliance: "Compliance & Transfers",
  settlement: "Settlement",
};

const STEP_IDS: OrderStepId[] = [
  "quota_reserved",
  "payment",
  "compliance",
  "settlement",
];

type ProgressInput = {
  orderStatus: OrderStatus;
  reservationStatus?: string | null;
  paymentStatus?: string | null;
  paymentConfirming?: boolean;
  settlementCompleted?: boolean;
};

function pastPayment(status: OrderStatus) {
  return (
    status === "AWAITING_COMPLIANCE" ||
    status === "AWAITING_TRANSFER" ||
    status === "AWAITING_SETTLEMENT" ||
    status === "COMPLETED" ||
    status === "REJECTED"
  );
}

function pastCompliance(status: OrderStatus) {
  return (
    status === "AWAITING_TRANSFER" ||
    status === "AWAITING_SETTLEMENT" ||
    status === "COMPLETED"
  );
}

function quotaState(input: ProgressInput): OrderStepState {
  if (input.reservationStatus === "RELEASED") {
    return "failed";
  }

  if (
    input.reservationStatus === "ACTIVE" ||
    input.reservationStatus === "CONSUMED"
  ) {
    return "done";
  }

  return input.orderStatus === "CANCELLED" ? "failed" : "upcoming";
}

function paymentState(input: ProgressInput): OrderStepState {
  if (input.orderStatus === "AWAITING_PAYMENT") {
    return "current";
  }

  if (
    input.paymentStatus === "EXPIRED" ||
    input.paymentStatus === "FAILED"
  ) {
    return "failed";
  }

  if (input.paymentStatus === "PAID" || pastPayment(input.orderStatus)) {
    return "done";
  }

  if (input.orderStatus === "CANCELLED") {
    return "failed";
  }

  return "upcoming";
}

function complianceState(input: ProgressInput): OrderStepState {
  if (input.orderStatus === "REJECTED") {
    return "failed";
  }

  if (input.orderStatus === "AWAITING_COMPLIANCE") {
    return "current";
  }

  if (pastCompliance(input.orderStatus)) {
    return "done";
  }

  if (
    input.orderStatus === "CANCELLED" &&
    input.paymentStatus === "PAID"
  ) {
    return "failed";
  }

  return "upcoming";
}

function settlementState(input: ProgressInput): OrderStepState {
  if (input.orderStatus === "COMPLETED" || input.settlementCompleted) {
    return "done";
  }

  if (
    input.orderStatus === "AWAITING_TRANSFER" ||
    input.orderStatus === "AWAITING_SETTLEMENT"
  ) {
    return "current";
  }

  return "upcoming";
}

const stateFor: Record<OrderStepId, (input: ProgressInput) => OrderStepState> =
  {
    quota_reserved: quotaState,
    payment: paymentState,
    compliance: complianceState,
    settlement: settlementState,
  };

function quotaDetail(input: ProgressInput, state: OrderStepState) {
  if (input.reservationStatus === "CONSUMED") {
    return "Consumed";
  }

  if (input.reservationStatus === "RELEASED" || state === "failed") {
    return "Released";
  }

  if (input.reservationStatus === "ACTIVE") {
    return "Active";
  }

  return "Waiting";
}

function paymentDetail(input: ProgressInput, state: OrderStepState) {
  if (state === "failed") {
    if (input.paymentStatus === "EXPIRED") {
      return "Expired";
    }

    if (input.paymentStatus === "FAILED") {
      return "Failed";
    }

    return "Cancelled";
  }

  if (input.paymentConfirming) {
    return "Confirming";
  }

  if (input.paymentStatus === "PAID") {
    return input.orderStatus === "COMPLETED"
      ? "Paid"
      : "Held until settlement";
  }

  if (state === "done") {
    return "Recorded";
  }

  if (state === "current") {
    return input.paymentStatus === "PENDING" ? "Pending" : "Pay now";
  }

  return "Waiting";
}

function complianceDetail(input: ProgressInput, state: OrderStepState) {
  if (state === "failed") {
    return input.orderStatus === "REJECTED" ? "Rejected" : "Cancelled";
  }

  if (state === "done") {
    return "Approved";
  }

  if (state === "current") {
    return "Awaiting review";
  }

  return "Waiting";
}

function settlementDetail(_input: ProgressInput, state: OrderStepState) {
  if (state === "done") {
    return "Completed";
  }

  if (state === "current") {
    return "In progress";
  }

  return "Waiting";
}

function stepDetail(
  id: OrderStepId,
  state: OrderStepState,
  input: ProgressInput,
) {
  switch (id) {
    case "quota_reserved":
      return quotaDetail(input, state);
    case "payment":
      return paymentDetail(input, state);
    case "compliance":
      return complianceDetail(input, state);
    case "settlement":
      return settlementDetail(input, state);
  }
}

export function buildOrderSteps(input: ProgressInput): OrderStep[] {
  return STEP_IDS.map((id) => {
    const state = stateFor[id](input);

    return {
      id,
      label: LABELS[id],
      state,
      detail: stepDetail(id, state, input),
    };
  });
}
