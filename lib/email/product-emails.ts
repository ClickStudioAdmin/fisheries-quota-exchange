export const PRODUCT_EMAIL_IDS = [
  "member_added",
  "member_role_changed",
  "member_removed",
  "ownership_transferred",
  "payments_setup_complete",
  "holding_verified",
  "holding_needs_changes",
  "listing_submitted",
  "listing_published",
  "listing_alert",
  "listing_rejected",
  "listing_expired",
  "listing_cancelled",
  "listing_purchased",
  "purchase_received",
  "auction_published",
  "bid_placed",
  "bid_outbid",
  "auction_new_bid",
  "auction_won",
  "auction_not_won",
  "auction_unsold",
  "auction_cancelled",
  "auction_ending_soon",
  "payment_received",
  "bank_debit_submitted",
  "settlement_failed",
  "checkout_expired",
  "payment_reminder",
  "transfer_in_progress",
  "transfer_complete",
  "order_settled",
  "operator_holding_pending",
  "operator_listing_pending",
  "operator_order_pending",
  "operator_payment_exception",
  "operator_transfer_exception",
] as const;

export type ProductEmailId = (typeof PRODUCT_EMAIL_IDS)[number];

export function isProductEmailId(value: string): value is ProductEmailId {
  return (PRODUCT_EMAIL_IDS as readonly string[]).includes(value);
}

export function emailIsDisabled(
  disabledEmails: readonly string[],
  template: string,
) {
  return disabledEmails.includes(template);
}

export function disabledProductEmails(
  enabled: Iterable<string>,
  catalog: readonly ProductEmailId[] = PRODUCT_EMAIL_IDS,
): ProductEmailId[] {
  const set = new Set(enabled);
  return catalog.filter((id) => !set.has(id));
}

export function isOperatorEmailId(id: ProductEmailId) {
  return id.startsWith("operator_");
}

export const MEMBER_EMAIL_IDS = PRODUCT_EMAIL_IDS.filter(
  (id) => !isOperatorEmailId(id),
);

export const OPERATOR_EMAIL_IDS = PRODUCT_EMAIL_IDS.filter(isOperatorEmailId);

export const PRODUCT_EMAIL_LABELS: Record<ProductEmailId, string> = {
  member_added: "Member added",
  member_role_changed: "Member role changed",
  member_removed: "Member removed",
  ownership_transferred: "Ownership transferred",
  payments_setup_complete: "Payments setup complete",
  holding_verified: "Holding verified",
  holding_needs_changes: "Holding needs changes",
  listing_submitted: "Listing submitted",
  listing_published: "Listing published",
  listing_alert: "New listing alert",
  listing_rejected: "Listing rejected",
  listing_expired: "Listing expired",
  listing_cancelled: "Listing cancelled",
  listing_purchased: "Listing purchased (seller)",
  purchase_received: "Purchase received (buyer)",
  auction_published: "Auction published",
  bid_placed: "Bid placed",
  bid_outbid: "You were outbid",
  auction_new_bid: "New bid on your auction",
  auction_won: "Auction won",
  auction_not_won: "Auction not won",
  auction_unsold: "Auction unsold",
  auction_cancelled: "Auction cancelled",
  auction_ending_soon: "Auction ending soon",
  payment_received: "Payment received",
  bank_debit_submitted: "Bank debit submitted",
  settlement_failed: "Settlement delayed or failed",
  checkout_expired: "Checkout expired",
  payment_reminder: "Payment reminder",
  transfer_in_progress: "Transfer in progress",
  transfer_complete: "Transfer complete",
  order_settled: "Order settled",
  operator_holding_pending: "Operator: holding needs verification",
  operator_listing_pending: "Operator: listing needs approval",
  operator_order_pending: "Operator: order needs action",
  operator_payment_exception: "Operator: payment exception",
  operator_transfer_exception: "Operator: transfer exception",
};
