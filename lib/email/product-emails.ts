export const PRODUCT_EMAIL_IDS = [
  "member_added",
  "member_role_changed",
  "member_removed",
  "ownership_transferred",
  "payments_setup_complete",
  "holding_verified",
  "holding_needs_changes",
  "custody_inbound_verified",
  "custody_inbound_cancelled",
  "custody_release_completed",
  "custody_release_cancelled",
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
  "payment_failed",
  "payment_reminder",
  "transfer_in_progress",
  "transfer_application_ready",
  "transfer_sign_online_ready",
  "transfer_recipient_signed",
  "transfer_online_pack_ready",
  "transfer_seller_signed_received",
  "transfer_buyer_form_ready",
  "transfer_buyer_signed_received",
  "transfer_seller_pack_returned",
  "compliance_rejected",
  "compliance_update_requested",
  "transfer_complete",
  "order_settled",
  "operator_holding_pending",
  "operator_listing_pending",
  "operator_order_pending",
  "custody_inbound_requested",
  "custody_release_requested",
  "lease_outbound_ready",
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
  return (
    id.startsWith("operator_") ||
    id === "custody_inbound_requested" ||
    id === "custody_release_requested" ||
    id === "lease_outbound_ready"
  );
}

export const MEMBER_EMAIL_IDS = PRODUCT_EMAIL_IDS.filter(
  (id) => !isOperatorEmailId(id),
);

export const OPERATOR_EMAIL_IDS = PRODUCT_EMAIL_IDS.filter(isOperatorEmailId);

const ACCOUNT_EMAIL_IDS: ProductEmailId[] = [
  "member_added",
  "member_role_changed",
  "member_removed",
  "ownership_transferred",
  "listing_alert",
];

const BUYER_EMAIL_IDS: ProductEmailId[] = [
  "purchase_received",
  "bid_placed",
  "bid_outbid",
  "auction_won",
  "auction_not_won",
  "auction_ending_soon",
  "bank_debit_submitted",
  "checkout_expired",
  "payment_failed",
  "payment_reminder",
  "payment_received",
  "compliance_rejected",
  "compliance_update_requested",
  "settlement_failed",
  "transfer_in_progress",
  "transfer_sign_online_ready",
  "transfer_recipient_signed",
  "transfer_online_pack_ready",
  "transfer_buyer_form_ready",
  "transfer_buyer_signed_received",
  "transfer_complete",
  "order_settled",
];

const SELLER_MANAGER_EMAIL_IDS: ProductEmailId[] = [
  "payments_setup_complete",
  "holding_verified",
  "holding_needs_changes",
  "custody_inbound_verified",
  "custody_inbound_cancelled",
  "custody_release_completed",
  "custody_release_cancelled",
  "listing_submitted",
  "listing_published",
  "listing_rejected",
  "listing_expired",
  "listing_cancelled",
  "listing_purchased",
  "auction_published",
  "auction_new_bid",
  "auction_unsold",
  "auction_cancelled",
  "auction_ending_soon",
  "checkout_expired",
  "payment_failed",
  "payment_received",
  "compliance_rejected",
  "compliance_update_requested",
  "settlement_failed",
  "transfer_in_progress",
  "transfer_application_ready",
  "transfer_sign_online_ready",
  "transfer_recipient_signed",
  "transfer_online_pack_ready",
  "transfer_seller_signed_received",
  "transfer_seller_pack_returned",
  "transfer_complete",
  "order_settled",
];

export type NotificationListGroup = {
  label: string;
  ids: readonly ProductEmailId[];
};

export const PROFILE_NOTIFICATION_GROUPS: NotificationListGroup[] = [
  {
    label: "Membership",
    ids: [
      "member_added",
      "member_role_changed",
      "member_removed",
      "ownership_transferred",
    ],
  },
  { label: "Listing alerts", ids: ["listing_alert"] },
];

export const ACCOUNT_NOTIFICATION_GROUPS: NotificationListGroup[] = [
  { label: "Payments setup", ids: ["payments_setup_complete"] },
  { label: "Holdings", ids: ["holding_verified", "holding_needs_changes", "custody_inbound_verified", "custody_inbound_cancelled", "custody_release_completed", "custody_release_cancelled"] },
  {
    label: "Listings",
    ids: [
      "listing_submitted",
      "listing_published",
      "listing_rejected",
      "listing_expired",
      "listing_cancelled",
      "listing_purchased",
    ],
  },
  {
    label: "Auctions",
    ids: [
      "auction_published",
      "auction_new_bid",
      "auction_unsold",
      "auction_cancelled",
      "auction_ending_soon",
    ],
  },
  {
    label: "Bids",
    ids: ["bid_placed", "bid_outbid", "auction_won", "auction_not_won"],
  },
  { label: "Purchases", ids: ["purchase_received"] },
  {
    label: "Payments and settlement",
    ids: [
      "bank_debit_submitted",
      "checkout_expired",
      "payment_failed",
      "payment_reminder",
      "payment_received",
      "compliance_rejected",
      "compliance_update_requested",
      "settlement_failed",
      "transfer_in_progress",
      "transfer_application_ready",
      "transfer_sign_online_ready",
      "transfer_recipient_signed",
      "transfer_online_pack_ready",
      "transfer_seller_signed_received",
      "transfer_buyer_form_ready",
      "transfer_buyer_signed_received",
      "transfer_seller_pack_returned",
      "transfer_complete",
      "order_settled",
    ],
  },
];

function uniqueGroupedIds(groups: readonly NotificationListGroup[]) {
  const ids: ProductEmailId[] = [];
  const seen = new Set<ProductEmailId>();

  for (const group of groups) {
    for (const id of group.ids) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }

  return ids;
}

export const ACCOUNT_NOTIFICATION_EMAIL_IDS = uniqueGroupedIds(
  ACCOUNT_NOTIFICATION_GROUPS,
);

export function groupedNotificationIds(
  groups: readonly NotificationListGroup[],
  emailIds: readonly ProductEmailId[],
) {
  const allowed = new Set(emailIds);

  return groups
    .map((group) => ({
      label: group.label,
      ids: group.ids.filter((id) => allowed.has(id)),
    }))
    .filter((group) => group.ids.length > 0);
}

export function isAccountNotificationEmailId(id: ProductEmailId) {
  return (ACCOUNT_NOTIFICATION_EMAIL_IDS as readonly ProductEmailId[]).includes(
    id,
  );
}

export function parseDisabledProductEmails(value: unknown): ProductEmailId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((id) => String(id))
    .filter((id): id is ProductEmailId => isProductEmailId(id) && !isOperatorEmailId(id));
}

export type NotificationAudience = "you" | "account_roles";

export function notificationAudiences(
  _id: ProductEmailId,
  scope: "profile" | "account" = "profile",
): NotificationAudience[] {
  return scope === "profile" ? ["you"] : ["account_roles"];
}

export function notificationAudienceLabel(audience: NotificationAudience) {
  return audience === "you" ? "You" : "Business roles";
}

export function personalNotificationEmailIds(input: {
  isOrgMember: boolean;
  isOrgManager: boolean;
}): ProductEmailId[] {
  const allowed = new Set<ProductEmailId>(ACCOUNT_EMAIL_IDS);

  if (input.isOrgMember) {
    for (const id of BUYER_EMAIL_IDS) {
      allowed.add(id);
    }
  }

  if (input.isOrgManager) {
    for (const id of SELLER_MANAGER_EMAIL_IDS) {
      allowed.add(id);
    }
  }

  return PRODUCT_EMAIL_IDS.filter((id) => allowed.has(id));
}

export function profileNotificationEmailIds(): ProductEmailId[] {
  return uniqueGroupedIds(PROFILE_NOTIFICATION_GROUPS);
}

export function accountNotificationEmailIds(input: {
  isOrgMember: boolean;
  isOrgManager: boolean;
}): ProductEmailId[] {
  if (!input.isOrgMember) {
    return [];
  }

  return ACCOUNT_NOTIFICATION_EMAIL_IDS;
}

export const PRODUCT_EMAIL_LABELS: Record<ProductEmailId, string> = {
  member_added: "Member invitation",
  member_role_changed: "Member role changed",
  member_removed: "Member removed",
  ownership_transferred: "Ownership transferred",
  payments_setup_complete: "Payments setup complete",
  holding_verified: "Holding verified",
  holding_needs_changes: "Holding needs changes",
  custody_inbound_verified: "Custodial quota verified",
  custody_inbound_cancelled: "Custodial request cancelled",
  custody_release_completed: "Custody release completed",
  custody_release_cancelled: "Custody release cancelled",
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
  bank_debit_submitted: "Bank debit submitted",
  checkout_expired: "Checkout expired",
  payment_failed: "Bank debit failed",
  payment_reminder: "Payment reminder",
  payment_received: "Payment received",
  compliance_rejected: "Compliance rejected",
  compliance_update_requested: "Compliance update requested",
  settlement_failed: "Settlement delayed or failed",
  transfer_in_progress: "Prepare transfer documents",
  transfer_application_ready: "Transfer application ready",
  transfer_sign_online_ready: "Sign online",
  transfer_recipient_signed: "You signed the transfer application",
  transfer_online_pack_ready: "Signed application received",
  transfer_seller_signed_received: "Seller-signed form received",
  transfer_buyer_form_ready: "Seller-signed form ready for buyer",
  transfer_buyer_signed_received: "Completed transfer pack received",
  transfer_seller_pack_returned: "Seller-signed form returned",
  transfer_complete: "Transfer complete",
  order_settled: "Order settled",
  operator_holding_pending: "Operator: holding needs verification",
  operator_listing_pending: "Operator: listing needs approval",
  operator_order_pending: "Operator: order needs action",
  custody_inbound_requested: "Operator: custodial inbound pending",
  custody_release_requested: "Operator: custody release pending",
  lease_outbound_ready: "Operator: lease outbound ready",
  operator_payment_exception: "Operator: payment exception",
  operator_transfer_exception: "Operator: transfer exception",
};
