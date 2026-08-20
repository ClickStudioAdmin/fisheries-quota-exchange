export const ORDER_STATUSES = [
  "AWAITING_PAYMENT",
  "AWAITING_COMPLIANCE",
  "AWAITING_TRANSFER",
  "AWAITING_SETTLEMENT",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Order = {
  id: number;
  listing_id: number;
  holding_id: number;
  seller_organisation_id: number;
  buyer_organisation_id: number;
  offering: "SALE" | "LEASE";
  quantity: string;
  unit_price_aud: string;
  amount_aud: string;
  fee_percent: string;
  fee_amount_aud: string;
  status: OrderStatus;
  seller_name: string;
  buyer_name: string;
  fishery_name: string;
  quota_type_name: string;
  measurement_kind: string;
  unit_label: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  review_note: string | null;
  compliance_checklist: string[];
};

export type QuotaReservation = {
  id: number;
  order_id: number;
  listing_id: number;
  holding_id: number;
  quantity: string;
  status: "ACTIVE" | "RELEASED" | "CONSUMED";
  created_at: string;
  released_at: string | null;
};

export type SimulatedTransaction = {
  id: number;
  order_id: number;
  status: "PENDING" | "COMPLETED";
  amount_aud: string;
  created_at: string;
  completed_at: string | null;
};

export type { AuditEvent } from "../audit/types";

export type OrderFormState = {
  error?: string;
  message?: string;
};

export function parseOrderIds(value?: string | null) {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(/[,\s]+/)
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
}

export const ORDER_QUEUE_STATUSES = [
  "AWAITING_COMPLIANCE",
  "AWAITING_TRANSFER",
  "AWAITING_SETTLEMENT",
] as const;

export type OrderQueueStatus = (typeof ORDER_QUEUE_STATUSES)[number];

export function isOrderQueueStatus(
  status: string,
): status is OrderQueueStatus {
  return (ORDER_QUEUE_STATUSES as readonly string[]).includes(status);
}

export function orderQueuePath(ids: Array<string | number>) {
  const unique = parseOrderIds(ids.join(","));

  if (unique.length === 0) {
    return "/admin/orders";
  }

  return `/admin/orders?queue=${unique.join(",")}`;
}

export function orderQueueTitle(status: OrderQueueStatus) {
  switch (status) {
    case "AWAITING_COMPLIANCE":
      return "Review orders";
    case "AWAITING_TRANSFER":
      return "Transfer";
    case "AWAITING_SETTLEMENT":
      return "Simulate settlement";
  }
}

export function qldTransferPublicStatusLabel(status?: string | null) {
  switch (status ?? "READY") {
    case "DOCUMENT_GENERATED":
    case "AWAITING_SIGNED_PACK":
      return "2 of 4 · Waiting for signed documents";
    case "ADMIN_REVIEW":
      return "3 of 4 · Reviewing signed pack";
    case "SUBMITTED":
    case "PROCESSING":
      return "4 of 4 · With Fisheries Queensland";
    case "APPROVED":
      return "Fisheries Queensland approved";
    case "ACTION_REQUIRED":
      return "Action required";
    default:
      return "1 of 4 · Waiting for application";
  }
}

export function orderStatusLabel(
  status: OrderStatus,
  transfer?: {
    usesSimulatedTransfer: boolean;
    applicationStatus?: string | null;
  } | null,
) {
  if (
    status === "AWAITING_TRANSFER" &&
    transfer &&
    !transfer.usesSimulatedTransfer
  ) {
    return qldTransferPublicStatusLabel(transfer.applicationStatus);
  }

  switch (status) {
    case "AWAITING_PAYMENT":
      return "Awaiting payment";
    case "AWAITING_COMPLIANCE":
      return "Awaiting compliance";
    case "AWAITING_TRANSFER":
      return "Awaiting transfer";
    case "AWAITING_SETTLEMENT":
      return "Awaiting settlement";
    case "COMPLETED":
      return "Completed";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
  }
}
