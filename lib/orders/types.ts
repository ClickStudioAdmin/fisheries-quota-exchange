import type { SigningChannel } from "@/lib/transfers/signing-channel";

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
  unused_quantity: string | null;
  used_quantity: string | null;
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
  qld_signing_channel: SigningChannel | null;
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
      return "Transfer orders";
    case "AWAITING_SETTLEMENT":
      return "Simulate settlement";
  }
}

export function adminTransferActionLabel(usesSimulatedTransfer: boolean) {
  return usesSimulatedTransfer ? "Simulate transfer" : "Open transfer";
}

export function qldTransferPublicStatusLabel(
  status?: string | null,
  signingChannel?: SigningChannel | string | null,
) {
  if (signingChannel === "PANDADOC") {
    switch (status ?? "READY") {
      case "AWAITING_SIGNATURES":
        return "2 of 4 · Waiting for signatures";
      case "ADMIN_REVIEW":
        return "3 of 4 · Reviewing completed pack";
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

  switch (status ?? "READY") {
    case "AWAITING_SELLER_SIGNATURE":
      return "2 of 6 · Waiting for seller to sign";
    case "AWAITING_SELLER_PACK_REVIEW":
      return "3 of 6 · Checking seller signed form";
    case "AWAITING_BUYER_SIGNATURE":
      return "4 of 6 · Waiting for buyer to sign";
    case "ADMIN_REVIEW":
      return "5 of 6 · Reviewing completed pack";
    case "SUBMITTED":
    case "PROCESSING":
      return "6 of 6 · With Fisheries Queensland";
    case "APPROVED":
      return "Fisheries Queensland approved";
    case "ACTION_REQUIRED":
      return "Action required";
    default:
      return "1 of 6 · Waiting for application";
  }
}

export function orderStatusLabel(
  status: OrderStatus,
  transfer?: {
    usesSimulatedTransfer: boolean;
    applicationStatus?: string | null;
    signingChannel?: string | null;
  } | null,
) {
  if (
    status === "AWAITING_TRANSFER" &&
    transfer &&
    !transfer.usesSimulatedTransfer
  ) {
    return qldTransferPublicStatusLabel(
      transfer.applicationStatus,
      transfer.signingChannel,
    );
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
