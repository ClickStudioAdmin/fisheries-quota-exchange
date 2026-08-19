import type { NoticeEmailData } from "@/lib/email/types";

function notice(
  subject: string,
  paragraphs: string[],
  action?: { label: string; url: string },
): NoticeEmailData {
  return {
    subject,
    preview: subject,
    heading: subject,
    paragraphs,
    actionLabel: action?.label,
    actionUrl: action?.url,
  };
}

export const emailCopy = {
  member_added: (input: {
    accountName: string;
    role: string;
    acceptUrl: string;
    registerUrl: string;
  }) =>
    notice(
      `You have been invited to ${input.accountName} on FQX`,
      [
        `You have been invited to join ${input.accountName} as ${input.role}. You are not a member until you accept.`,
        "Accept this invitation while signed in with this email. It expires in 14 days.",
        `If you do not have an FQX account yet, register with this email first: ${input.registerUrl}`,
      ],
      { label: "Accept invitation", url: input.acceptUrl },
    ),
  member_role_changed: (input: {
    accountName: string;
    role: string;
    accountUrl: string;
  }) =>
    notice(
      `Your role on ${input.accountName} is now ${input.role}`,
      [`Your FQX role for ${input.accountName} is now ${input.role}.`],
      { label: "Open business", url: input.accountUrl },
    ),
  member_removed: (input: { accountName: string; siteUrl: string }) =>
    notice(`You were removed from ${input.accountName} on FQX`, [
      `You are no longer a member of ${input.accountName} on Fisheries Quota Exchange.`,
    ], { label: "FQX", url: input.siteUrl }),
  ownership_transferred: (input: {
    accountName: string;
    accountUrl: string;
  }) =>
    notice(
      `You are now an owner of ${input.accountName}`,
      [
        `Your role on ${input.accountName} is now Owner. You can manage members and payments on Business Settings, and listings for this business.`,
      ],
      { label: "Open business", url: input.accountUrl },
    ),
  payments_setup_complete: (input: {
    accountName: string;
    paymentsUrl: string;
  }) =>
    notice(
      `Payments setup is complete for ${input.accountName}`,
      [
        "This business can receive settlement transfers on FQX. You can list quota for sale or lease when holdings are verified. Review payments setup on the Payments tab of Business Settings.",
      ],
      { label: "Business Settings", url: input.paymentsUrl },
    ),
  holding_verified: (input: {
    fisheryName: string;
    holdingUrl: string;
  }) =>
    notice(
      `Holding verified: ${input.fisheryName}`,
      [
        "This holding is verified. You can list quota from it when payments setup is complete on the Payments tab of Business Settings.",
      ],
      { label: "View holding", url: input.holdingUrl },
    ),
  holding_needs_changes: (input: {
    fisheryName: string;
    note: string;
    holdingUrl: string;
  }) =>
    notice(
      `Holding needs changes: ${input.fisheryName}`,
      [
        "FQX needs more information or a change before this holding can be verified.",
        input.note ? `Note: ${input.note}` : "No note was recorded.",
      ],
      { label: "View holding", url: input.holdingUrl },
    ),
  listing_submitted: (input: {
    fisheryName: string;
    listingUrl: string;
  }) =>
    notice(
      `Listing submitted for approval: ${input.fisheryName}`,
      ["Your listing is waiting for FQX approval before it appears on the marketplace."],
      { label: "View listing", url: input.listingUrl },
    ),
  listing_published: (input: {
    fisheryName: string;
    listingUrl: string;
  }) =>
    notice(
      `Listing published: ${input.fisheryName}`,
      ["Your listing is on the marketplace."],
      { label: "View listing", url: input.listingUrl },
    ),
  listing_alert: (input: {
    fisheryName: string;
    offeringLabel: string;
    listingTypeLabel: string;
    listingUrl: string;
  }) =>
    notice(
      `New ${input.offeringLabel.toLowerCase()} listing: ${input.fisheryName}`,
      [
        `A new ${input.listingTypeLabel.toLowerCase()} ${input.offeringLabel.toLowerCase()} listing for ${input.fisheryName} is on the marketplace.`,
        "You asked for this alert on Account Settings → Alerts. You can change those fisheries there.",
      ],
      { label: "View listing", url: input.listingUrl },
    ),
  listing_rejected: (input: {
    fisheryName: string;
    note: string;
    listingUrl: string;
  }) =>
    notice(
      `Listing rejected: ${input.fisheryName}`,
      [
        "FQX did not publish this listing.",
        input.note ? `Note: ${input.note}` : "No note was recorded.",
      ],
      { label: "View listing", url: input.listingUrl },
    ),
  listing_expired: (input: {
    fisheryName: string;
    listingUrl: string;
  }) =>
    notice(
      `Listing expired: ${input.fisheryName}`,
      ["This listing has passed its end time and is no longer open on the marketplace."],
      { label: "View listing", url: input.listingUrl },
    ),
  listing_cancelled: (input: {
    fisheryName: string;
    listingUrl: string;
  }) =>
    notice(
      `Listing cancelled: ${input.fisheryName}`,
      ["This listing was cancelled. The quota is available to list again."],
      { label: "View listing", url: input.listingUrl },
    ),
  listing_purchased: (input: {
    fisheryName: string;
    orderUrl: string;
  }) =>
    notice(
      `Your listing was purchased: ${input.fisheryName}`,
      [
        "Quota is reserved. The buyer pays FQX next. Settlement follows compliance and transfer.",
      ],
      { label: "View order", url: input.orderUrl },
    ),
  purchase_received: (input: {
    fisheryName: string;
    orderUrl: string;
  }) =>
    notice(
      `Purchase received: ${input.fisheryName}`,
      [
        "Quota is reserved. Pay FQX from the order page. FQX holds the funds until settlement.",
      ],
      { label: "Pay FQX", url: input.orderUrl },
    ),
  auction_published: (input: {
    fisheryName: string;
    auctionUrl: string;
  }) =>
    notice(
      `Auction published: ${input.fisheryName}`,
      ["Your auction is on the marketplace."],
      { label: "View auction", url: input.auctionUrl },
    ),
  bid_placed: (input: {
    fisheryName: string;
    amount: string;
    auctionUrl: string;
  }) =>
    notice(
      `Bid placed: ${input.fisheryName}`,
      [`Your bid of ${input.amount} per unit was recorded using server time.`],
      { label: "View auction", url: input.auctionUrl },
    ),
  bid_outbid: (input: {
    fisheryName: string;
    auctionUrl: string;
  }) =>
    notice(
      `You were outbid: ${input.fisheryName}`,
      ["Another bid is now highest. You can bid again before the auction ends."],
      { label: "View auction", url: input.auctionUrl },
    ),
  auction_new_bid: (input: {
    fisheryName: string;
    amount: string;
    auctionUrl: string;
  }) =>
    notice(
      `New bid on your auction: ${input.fisheryName}`,
      [`A bid of ${input.amount} per unit was placed.`],
      { label: "View auction", url: input.auctionUrl },
    ),
  auction_won: (input: {
    fisheryName: string;
    orderUrl: string;
  }) =>
    notice(
      `You won the auction: ${input.fisheryName}`,
      ["An order was created and quota is reserved. Open the order to pay FQX if payment is due, then wait for settlement."],
      { label: "View order", url: input.orderUrl },
    ),
  auction_not_won: (input: {
    fisheryName: string;
    auctionUrl: string;
  }) =>
    notice(
      `Auction closed: ${input.fisheryName}`,
      ["This auction closed with a winning bid. Your bid did not win."],
      { label: "View auction", url: input.auctionUrl },
    ),
  auction_unsold: (input: {
    fisheryName: string;
    auctionUrl: string;
  }) =>
    notice(
      `Auction unsold: ${input.fisheryName}`,
      [
        "The auction closed without a qualifying bid. The quota is available to list again.",
      ],
      { label: "View auction", url: input.auctionUrl },
    ),
  auction_cancelled: (input: {
    fisheryName: string;
    auctionUrl: string;
  }) =>
    notice(
      `Auction cancelled: ${input.fisheryName}`,
      ["This auction was cancelled. The quota is available to list again."],
      { label: "View auction", url: input.auctionUrl },
    ),
  auction_ending_soon: (input: {
    fisheryName: string;
    auctionUrl: string;
  }) =>
    notice(
      `Auction ending soon: ${input.fisheryName}`,
      ["This auction is due to end within 24 hours. Bid times use the server clock."],
      { label: "View auction", url: input.auctionUrl },
    ),
  payment_received: (input: { orderId: number; orderUrl: string }) =>
    notice(
      `Payment received for FQX order ${input.orderId}`,
      [
        "FQX has recorded payment. Funds are held until settlement. The order now waits for compliance.",
      ],
      { label: "View order", url: input.orderUrl },
    ),
  bank_debit_submitted: (input: { orderId: number; orderUrl: string }) =>
    notice(
      `Bank debit submitted for FQX order ${input.orderId}`,
      [
        "Your Australian bank debit was submitted. Stripe may show Incoming until it clears. This page will update when payment is confirmed.",
      ],
      { label: "View order", url: input.orderUrl },
    ),
  settlement_failed: (input: { orderId: number; orderUrl: string }) =>
    notice(
      `Settlement is delayed for FQX order ${input.orderId}`,
      [
        "The seller transfer did not complete. Quota settlement was not finished. FQX will retry or correct this; do not treat the browser as the source of truth.",
      ],
      { label: "View order", url: input.orderUrl },
    ),
  checkout_expired: (input: {
    orderId: number;
    orderUrl: string;
    forSeller?: boolean;
  }) =>
    notice(
      `Checkout expired for FQX order ${input.orderId}`,
      [
        input.forSeller
          ? "The buyer did not complete unpaid checkout in time. The order was cancelled and the quota reservation was released."
          : "The unpaid checkout expired. The order was cancelled and the quota reservation was released.",
      ],
      { label: "View order", url: input.orderUrl },
    ),
  payment_failed: (input: {
    orderId: number;
    orderUrl: string;
    forSeller?: boolean;
  }) =>
    notice(
      `Bank debit failed for FQX order ${input.orderId}`,
      [
        input.forSeller
          ? "The buyer’s bank debit failed. The unpaid order was cancelled and the quota reservation was released."
          : "The bank debit failed. The unpaid order was cancelled and the quota reservation was released.",
      ],
      { label: "View order", url: input.orderUrl },
    ),
  payment_reminder: (input: { orderId: number; orderUrl: string }) =>
    notice(
      `Payment still due for FQX order ${input.orderId}`,
      ["This order is still awaiting payment. Pay FQX from the order page to keep the reservation."],
      { label: "Pay FQX", url: input.orderUrl },
    ),
  transfer_in_progress: (input: { orderId: number; orderUrl: string }) =>
    notice(
      `Quota transfer has started for FQX order ${input.orderId}`,
      ["Compliance passed. FQX is running the authority transfer for this order."],
      { label: "View order", url: input.orderUrl },
    ),
  compliance_rejected: (input: {
    orderId: number;
    orderUrl: string;
    note: string;
    forSeller?: boolean;
  }) =>
    notice(
      `Compliance was not approved for FQX order ${input.orderId}`,
      [
        input.forSeller
          ? "FQX did not approve compliance. The order was cancelled and the quota reservation was released."
          : "FQX did not approve compliance for this order. The order was cancelled and the quota reservation was released.",
        input.note ? `Note: ${input.note}` : "No note was recorded.",
      ],
      { label: "View order", url: input.orderUrl },
    ),
  transfer_complete: (input: { orderId: number; orderUrl: string }) =>
    notice(
      `Quota transfer is complete for FQX order ${input.orderId}`,
      ["The simulated authority transfer is complete. Settlement is next."],
      { label: "View order", url: input.orderUrl },
    ),
  order_settled: (input: {
    orderId: number;
    offeringLabel: string;
    amount: string;
    orderUrl: string;
    forSeller: boolean;
  }) =>
    notice(
      `Order ${input.orderId} has settled`,
      input.forSeller
        ? [
            `Simulated settlement is complete (${input.offeringLabel}). Dummy tax invoices are attached: quota (seller to buyer) and platform fee (FQX to you).`,
            `Quota total ${input.amount}. These are not real tax invoices.`,
          ]
        : [
            `Simulated settlement is complete (${input.offeringLabel}). Dummy tax invoices are attached: quota (seller to you) and the platform fee invoice (FQX to the seller).`,
            `Quota total ${input.amount}. These are not real tax invoices.`,
          ],
      { label: "View order", url: input.orderUrl },
    ),
  operator_holding_pending: (input: {
    holdingId: number;
    adminUrl: string;
  }) =>
    notice(
      `Holding ${input.holdingId} needs verification`,
      ["A quota holding is waiting for verification."],
      { label: "Admin holdings", url: input.adminUrl },
    ),
  operator_listing_pending: (input: {
    listingId: number;
    adminUrl: string;
  }) =>
    notice(
      `Listing ${input.listingId} needs approval`,
      ["A listing or auction is waiting for approval."],
      { label: "Admin listings", url: input.adminUrl },
    ),
  operator_order_pending: (input: {
    orderId: number;
    status: string;
    adminUrl: string;
  }) =>
    notice(
      `Order ${input.orderId} needs action`,
      [`An order is ${input.status}.`],
      { label: "Admin orders", url: input.adminUrl },
    ),
  operator_payment_exception: (input: {
    orderId: number;
    detail: string;
    adminUrl: string;
  }) =>
    notice(
      `Payment exception on order ${input.orderId}`,
      [input.detail],
      { label: "Admin orders", url: input.adminUrl },
    ),
  operator_transfer_exception: (input: {
    orderId: number;
    detail: string;
    adminUrl: string;
  }) =>
    notice(
      `Transfer exception on order ${input.orderId}`,
      [input.detail],
      { label: "Admin orders", url: input.adminUrl },
    ),
};
