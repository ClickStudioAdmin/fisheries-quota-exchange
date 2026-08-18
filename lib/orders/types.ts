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

export type AuditEvent = {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: number;
  actor_email: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type OrderFormState = {
  error?: string;
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

export function orderStatusLabel(status: OrderStatus) {
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

export function auditEventLabel(eventType: string) {
  switch (eventType) {
    case "ORDER_CREATED":
      return "Order created";
    case "QUOTA_RESERVED":
      return "Quota reserved";
    case "ORDER_CANCELLED":
      return "Order cancelled";
    case "PAYMENT_RECEIVED":
      return "Payment received";
    case "PAYMENT_FAILED":
      return "Payment failed";
    case "COMPLIANCE_APPROVED":
      return "Compliance approved";
    case "COMPLIANCE_REJECTED":
      return "Compliance rejected";
    case "TRANSFER_SIMULATED":
      return "Transfer recorded";
    case "SETTLEMENT_SIMULATED":
      return "Settlement completed";
    case "BID_PLACED":
      return "Bid placed";
    case "AUCTION_CLOSED":
      return "Auction closed";
    case "AUCTION_UNSOLD":
      return "Auction unsold";
    default:
      return eventType
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}
