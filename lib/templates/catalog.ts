import {
  PRODUCT_EMAIL_IDS,
  PRODUCT_EMAIL_LABELS,
  isProductEmailId,
  type ProductEmailId,
} from "@/lib/email/product-emails";
import { sampleEmailData as sampleProductEmail } from "@/lib/email/sample";
import type { EmailTemplate, EmailTemplates } from "@/lib/email/types";
import { buildTaxInvoiceData } from "@/lib/invoices/from-order";
import type { TaxInvoiceData, TaxInvoiceKind } from "@/lib/invoices/types";
import type { Order } from "@/lib/orders/types";
import { orderChargeAud } from "@/lib/payments/money";

export const MESSAGE_TEMPLATE_IDS = [
  ...PRODUCT_EMAIL_IDS,
  "tax_invoice_quota",
  "tax_invoice_fee",
] as const;

export type MessageTemplateId = (typeof MESSAGE_TEMPLATE_IDS)[number];

export type MessageTemplate = {
  id: MessageTemplateId;
  kind: "email" | "pdf";
  name: string;
  description: string;
  summary: string;
  sentWhen: string;
  trigger: string;
  recipient: string;
  skipWhen: string;
  source: string;
  attachments: string[];
  related: { id: MessageTemplateId; label: string }[];
};

const skipWhen =
  "The email is disabled on /admin/settings, the recipient turned a personal channel off on Account Settings → Notifications, the organisation turned that business message off on Business Settings → Notifications, RESEND_API_KEY or EMAIL_FROM is missing, the site URL cannot be resolved, the recipient is invalid, or Resend rejects the send. In-app notices still write unless that channel is off. The triggering action still succeeds.";

const accountRolesRecipient =
  "Roles selected on Business Settings → Notifications (default Owner and Admin). Falls back to owners if those roles have no members.";
const accountRolesAndCreatorRecipient = `${accountRolesRecipient} Also the listing creator.`;
const bidderAccountRolesRecipient =
  "Notification roles on that bidding business (default Owner and Admin).";
const buyerAndSellerRolesRecipient =
  "Notification roles on the buying business and the selling business (default Owner and Admin).";
const sellerRolesRecipient =
  "Notification roles on the selling business (default Owner and Admin).";
const buyerRolesRecipient =
  "Notification roles on the buying business (default Owner and Admin).";

const EMAIL_CATALOG: Record<
  ProductEmailId,
  Pick<MessageTemplate, "description" | "summary" | "sentWhen" | "trigger" | "recipient">
> = {
  member_added: {
    summary: "When a person is invited to a business",
    description:
      "Tells a person they have been invited to an FQX business and how to accept. They are not a member until they accept while signed in with that email.",
    sentWhen: "Immediately after a pending invitation is created or resent.",
    trigger: "Business Owner or Admin submits Send invitation. inviteMemberAction then sendEmail(member_added).",
    recipient: "The invited person’s email.",
  },
  member_role_changed: {
    summary: "After a non-owner role change",
    description: "Tells the member their role on the business changed.",
    sentWhen: "After organisation_users.role is updated to Admin or Member.",
    trigger: "updateMemberRoleAction when the new role is not Owner.",
    recipient: "The member whose role changed.",
  },
  member_removed: {
    summary: "After someone is removed from a business",
    description: "Tells the person they are no longer a member of the business.",
    sentWhen: "After the membership row is deleted by another member.",
    trigger: "removeMemberAction when the actor is not leaving themselves.",
    recipient: "The removed member’s email.",
  },
  ownership_transferred: {
    summary: "After a member is made Owner",
    description: "Tells the member they are now an owner of the business.",
    sentWhen: "After organisation_users.role is set to Owner.",
    trigger: "updateMemberRoleAction when the new role is Owner.",
    recipient: "The new Owner.",
  },
  payments_setup_complete: {
    summary: "When Stripe charges are enabled",
    description:
      "Tells business managers that Connect onboarding can accept charges and settlement transfers.",
    sentWhen: "Once per organisation, when Stripe account.updated reports charges_enabled.",
    trigger: "handleStripeWebhook account.updated, then claim_email_dispatch(payments_setup_complete).",
    recipient: accountRolesRecipient,
  },
  holding_verified: {
    summary: "After a holding is verified",
    description: "Tells managers the holding can be listed when payments setup is complete on the Payments tab of Business Settings.",
    sentWhen: "After verify_quota_holding, or when create_quota_holding auto-verifies.",
    trigger: "verifyHoldingAction or createHoldingAction when status is VERIFIED.",
    recipient: accountRolesRecipient,
  },
  holding_needs_changes: {
    summary: "When admin requests holding changes",
    description:
      "Tells managers FQX needs more information. The holding stays pending verification.",
    sentWhen: "When a platform admin submits Request changes. Status does not change.",
    trigger: "requestHoldingChangesAction on /admin/holdings.",
    recipient: accountRolesRecipient,
  },
  listing_submitted: {
    summary: "After a listing waits for approval",
    description: "Confirms the listing is pending FQX approval.",
    sentWhen: "After create_listing when status is PENDING_APPROVAL.",
    trigger: "createListingAction / createAuctionAction then notifyListingCreated.",
    recipient: accountRolesAndCreatorRecipient,
  },
  listing_published: {
    summary: "When a fixed-price listing is published",
    description: "Tells the seller the listing is on the marketplace.",
    sentWhen: "On create when auto-published, or when admin approves a fixed-price listing.",
    trigger: "notifyListingCreated or notifyListingPublished for FIXED_PRICE.",
    recipient: accountRolesAndCreatorRecipient,
  },
  listing_alert: {
    summary: "When a subscribed fishery gets a new listing",
    description:
      "Tells a user a new sale or lease listing (including auctions) is on the marketplace for a fishery they ticked on Account Settings → Alerts. The quantity includes unused and used units when those were stored on the listing.",
    sentWhen: "When a listing or auction is published, matching sale or lease alerts for that fishery.",
    trigger: "notifyListingCreated or notifyListingPublished then notifyNewListingAlert.",
    recipient: "Users with a matching fishery alert on Account Settings → Alerts, excluding the seller’s organisation.",
  },
  listing_rejected: {
    summary: "When a listing is rejected",
    description: "Tells the seller FQX did not publish the listing.",
    sentWhen: "After reject_listing.",
    trigger: "rejectListingAction.",
    recipient: accountRolesAndCreatorRecipient,
  },
  listing_expired: {
    summary: "When a published listing has passed its end time",
    description: "Tells the seller the listing is no longer open.",
    sentWhen: "Hourly cron, once per listing, when a published fixed-price listing has expired.",
    trigger: "runScheduledEmails via /api/cron/emails.",
    recipient: accountRolesAndCreatorRecipient,
  },
  listing_cancelled: {
    summary: "When a fixed-price listing is cancelled",
    description: "Confirms cancellation and that quota can be listed again.",
    sentWhen: "After cancel_listing for a fixed-price listing.",
    trigger: "cancelListingAction then notifyListingCancelled.",
    recipient: accountRolesAndCreatorRecipient,
  },
  listing_purchased: {
    summary: "Seller: listing or auction became an order",
    description: "Tells the seller quota is reserved and the buyer pays FQX next. Quantity includes unused and used units when those were stored on the order.",
    sentWhen: "After create_order, or when an auction closes with a winner.",
    trigger: "notifyOrderCreated or notifyAuctionClosed.",
    recipient: accountRolesAndCreatorRecipient,
  },
  purchase_received: {
    summary: "Buyer: purchase created",
    description: "Tells the buyer to pay FQX from the order page. Quantity includes unused and used units when those were stored on the order.",
    sentWhen: "After create_order for a fixed-price purchase.",
    trigger: "notifyOrderCreated.",
    recipient: accountRolesRecipient,
  },
  auction_published: {
    summary: "When an auction is published",
    description: "Tells the seller the auction is on the marketplace.",
    sentWhen: "On create when auto-published, or when admin approves an auction.",
    trigger: "notifyListingCreated or notifyListingPublished for AUCTION.",
    recipient: accountRolesAndCreatorRecipient,
  },
  bid_placed: {
    summary: "After a bid is recorded",
    description: "Confirms the bid using server time.",
    sentWhen: "After place_bid succeeds.",
    trigger: "placeBidAction then notifyBidPlaced.",
    recipient: accountRolesRecipient,
  },
  bid_outbid: {
    summary: "When a later bid takes the lead",
    description: "Tells the previous highest bidder they were outbid.",
    sentWhen: "After a new bid from a different organisation.",
    trigger: "notifyBidPlaced when a previous bid exists.",
    recipient: bidderAccountRolesRecipient,
  },
  auction_new_bid: {
    summary: "Seller: new bid on their auction",
    description: "Tells the seller a new bid was placed.",
    sentWhen: "After each successful bid.",
    trigger: "notifyBidPlaced.",
    recipient: accountRolesRecipient,
  },
  auction_won: {
    summary: "Winning bidder after close",
    description: "Tells the winner an order was created. Quantity includes unused and used units when those were stored on the order.",
    sentWhen: "When ensureAuctionClosed / closeAuction creates an order.",
    trigger: "notifyAuctionClosed.",
    recipient: accountRolesRecipient,
  },
  auction_not_won: {
    summary: "Other bidders after a sale",
    description: "Tells unsuccessful bidders the auction closed with a winner.",
    sentWhen: "After auction close with an order, once per other bidding organisation.",
    trigger: "notifyAuctionClosed.",
    recipient: bidderAccountRolesRecipient,
  },
  auction_unsold: {
    summary: "Seller: auction closed with no winner",
    description: "Tells the seller there was no qualifying bid.",
    sentWhen: "When an auction closes without an order.",
    trigger: "notifyAuctionClosed.",
    recipient: accountRolesAndCreatorRecipient,
  },
  auction_cancelled: {
    summary: "When an auction is cancelled",
    description: "Confirms cancellation before close.",
    sentWhen: "After cancel_listing for an auction.",
    trigger: "notifyListingCancelled.",
    recipient: accountRolesAndCreatorRecipient,
  },
  auction_ending_soon: {
    summary: "Auction due to end within 24 hours",
    description: "Reminds seller and bidders the auction is ending. Bid times use the server clock.",
    sentWhen: "Hourly cron, once per auction, while published and ending within 24 hours.",
    trigger: "runScheduledEmails via /api/cron/emails.",
    recipient: `${accountRolesAndCreatorRecipient} Plus notification roles on bidding businesses.`,
  },
  payment_received: {
    summary: "When FQX records payment",
    description: "Tells buyer and seller payment is held until settlement.",
    sentWhen: "Once per order after mark_order_paid (webhook or reconcile).",
    trigger: "handleStripeWebhook or reconcileOrderPayment, then claim_email_dispatch(payment_received).",
    recipient: buyerAndSellerRolesRecipient,
  },
  compliance_rejected: {
    summary: "When admin does not approve compliance",
    description:
      "Tells buyer and seller the order was cancelled and the quota reservation was released.",
    sentWhen: "After reject_compliance.",
    trigger: "rejectComplianceAction then claim_email_dispatch(compliance_rejected).",
    recipient: buyerAndSellerRolesRecipient,
  },
  compliance_update_requested: {
    summary: "When admin asks a party to update details during compliance",
    description:
      "Tells only the selected buyer and/or seller that compliance review is still open and what FQX needs. The other party is not emailed. The order is not cancelled.",
    sentWhen: "After request_compliance_update. Can be sent more than once.",
    trigger: "requestComplianceUpdateAction then notifyComplianceUpdateRequested.",
    recipient:
      "Notification roles on each selected business only (buyer, seller, or both).",
  },
  bank_debit_submitted: {
    summary: "When BECS checkout completes unpaid",
    description: "Tells the buyer the bank debit was submitted and may show Incoming until it clears.",
    sentWhen: "Once per order on checkout.session.completed with payment_status unpaid.",
    trigger: "handleStripeWebhook then claim_email_dispatch(bank_debit_submitted).",
    recipient: accountRolesRecipient,
  },
  settlement_failed: {
    summary: "When the seller settlement transfer fails",
    description:
      "Tells parties quota settlement did not complete because the Stripe Transfer failed.",
    sentWhen: "Before simulate_settlement, if transferOrderSellerProceeds returns an error.",
    trigger: "simulateSettlementAction.",
    recipient: buyerAndSellerRolesRecipient,
  },
  checkout_expired: {
    summary: "When unpaid checkout expires",
    description:
      "Tells buyer and seller the order was cancelled and quota released.",
    sentWhen: "Once per order on checkout.session.expired after fail_unpaid_order.",
    trigger: "handleStripeWebhook then claim_email_dispatch(checkout_expired).",
    recipient: buyerAndSellerRolesRecipient,
  },
  payment_failed: {
    summary: "When an unpaid bank debit fails",
    description:
      "Tells buyer and seller the unpaid order was cancelled and quota released.",
    sentWhen: "Once per order on checkout.session.async_payment_failed after fail_unpaid_order.",
    trigger: "handleStripeWebhook then claim_email_dispatch(payment_failed).",
    recipient: buyerAndSellerRolesRecipient,
  },
  payment_reminder: {
    summary: "Unpaid order still awaiting payment after 24 hours",
    description: "Reminds the buyer to pay FQX to keep the reservation.",
    sentWhen: "Hourly cron, once per order, when status is AWAITING_PAYMENT for more than 24 hours.",
    trigger: "runScheduledEmails via /api/cron/emails.",
    recipient: accountRolesRecipient,
  },
  transfer_in_progress: {
    summary: "After compliance is approved",
    description:
      "On Queensland orders, tells the seller to sign first and the buyer to wait for the seller-signed form. On simulated orders, says the authority transfer has started.",
    sentWhen: "After approve_compliance.",
    trigger: "approveComplianceAction then notifyTransferInProgress.",
    recipient: buyerAndSellerRolesRecipient,
  },
  transfer_application_ready: {
    summary: "Queensland unsigned transfer PDF is ready",
    description:
      "Attaches the unsigned application PDF and tells the seller to sign, witness, and upload it.",
    sentWhen: "When an unsigned transfer PDF is generated or regenerated.",
    trigger: "generateTransferDocumentAction then notifyTransferApplicationReady.",
    recipient: `${sellerRolesRecipient} Receives the PDF attachment.`,
  },
  transfer_seller_signed_received: {
    summary: "Seller uploaded the signed application",
    description:
      "Confirms FQX has the seller-signed form and that the buyer cannot see it until FQX checks it.",
    sentWhen: "After the seller (or admin on their behalf) uploads the seller-signed PDF.",
    trigger: "uploadPartyTransferDocumentAction or admin seller-signed upload.",
    recipient: sellerRolesRecipient,
  },
  transfer_buyer_form_ready: {
    summary: "Seller-signed form is released to the buyer",
    description:
      "Attaches the accepted seller-signed PDF and tells the buyer to sign that file, not a blank copy.",
    sentWhen: "When admin accepts the seller-signed form.",
    trigger: "saveSellerPackChecklistAction then notifyTransferBuyerFormReady.",
    recipient: `${buyerRolesRecipient} Receives the seller-signed PDF attachment.`,
  },
  transfer_buyer_signed_received: {
    summary: "Completed pack uploaded",
    description:
      "Confirms FQX has the completed application for review before Fisheries Queensland submission.",
    sentWhen: "After the buyer (or admin) uploads the completed pack.",
    trigger: "uploadPartyTransferDocumentAction or admin completed-pack upload.",
    recipient: buyerRolesRecipient,
  },
  transfer_seller_pack_returned: {
    summary: "Seller-signed form returned",
    description:
      "Tells the seller FQX returned their signed form, with the admin note, and to upload a new copy.",
    sentWhen: "When admin returns the seller-signed form.",
    trigger: "returnSellerPackAction then notifyTransferSellerPackReturned.",
    recipient: sellerRolesRecipient,
  },
  transfer_complete: {
    summary: "After simulated authority transfer",
    description: "Tells parties transfer is complete and settlement is next.",
    sentWhen: "After simulate_transfer succeeds.",
    trigger: "simulateTransferAction then notifyTransferComplete.",
    recipient: buyerAndSellerRolesRecipient,
  },
  order_settled: {
    summary: "After simulated settlement completes",
    description:
      "Confirms settlement and attaches dummy tax invoice PDFs. The buyer receives the quota invoice (for their payment). The seller receives the platform fee invoice.",
    sentWhen: "After simulate_settlement succeeds and the order is COMPLETED.",
    trigger: "simulateSettlementAction then sendSettledOrderInvoice.",
    recipient: `${buyerAndSellerRolesRecipient} Buyer: quota PDF. Seller: fee PDF.`,
  },
  operator_holding_pending: {
    summary: "Operator: holding needs verification",
    description: "Alerts platform admins that a holding is waiting.",
    sentWhen: "After create_quota_holding when status is PENDING_VERIFICATION.",
    trigger: "createHoldingAction then notifyHoldingPending.",
    recipient: "platform_admins emails.",
  },
  operator_listing_pending: {
    summary: "Operator: listing needs approval",
    description: "Alerts platform admins that a listing or auction is waiting.",
    sentWhen: "After create when status is PENDING_APPROVAL.",
    trigger: "notifyListingCreated.",
    recipient: "platform_admins emails.",
  },
  operator_order_pending: {
    summary: "Operator: order needs action",
    description: "Alerts platform admins that an order is in a queue status.",
    sentWhen:
      "When an order enters AWAITING_COMPLIANCE, after payment, after compliance, or after transfer.",
    trigger: "notifyOrderCreated, notifyPaymentReceived, notifyTransferInProgress, notifyTransferComplete.",
    recipient: "platform_admins emails.",
  },
  operator_payment_exception: {
    summary: "Operator: payment exception",
    description: "Alerts platform admins to expired checkout, failed debit, or failed settlement transfer.",
    sentWhen: "On checkout.session.expired, async_payment_failed, or settlement transfer error.",
    trigger: "notifyCheckoutExpired, notifyPaymentFailed, notifySettlementFailed.",
    recipient: "platform_admins emails.",
  },
  operator_transfer_exception: {
    summary: "Operator: transfer exception",
    description: "Alerts platform admins that simulated authority transfer failed.",
    sentWhen: "When simulate_transfer returns an error.",
    trigger: "simulateTransferAction then notifyTransferException.",
    recipient: "platform_admins emails.",
  },
};

const emailTemplates: MessageTemplate[] = PRODUCT_EMAIL_IDS.map((id) => {
  const meta = EMAIL_CATALOG[id];
  return {
    id,
    kind: "email",
    name: PRODUCT_EMAIL_LABELS[id],
    description: meta.description,
    summary: meta.summary,
    sentWhen: meta.sentWhen,
    trigger: meta.trigger,
    recipient: meta.recipient,
    skipWhen,
    source: "lib/email/templates/notice.tsx",
    attachments: id === "order_settled" ? ["tax_invoice_quota", "tax_invoice_fee"] : [],
    related:
      id === "order_settled"
        ? [
            { id: "tax_invoice_quota", label: "Quota tax invoice PDF" },
            { id: "tax_invoice_fee", label: "Fee tax invoice PDF" },
          ]
        : [],
  };
});

const pdfTemplates: MessageTemplate[] = [
  {
    id: "tax_invoice_quota",
    kind: "pdf",
    name: "Simulated quota tax invoice",
    description:
      "Dummy A4 tax invoice for the quota: seller to buyer for the listed amount. Quantity includes unused and used units when those were stored on the order. Marked as not a real tax invoice. GST is not calculated. The PDF is generated in memory and is not stored.",
    summary: "Attached to the buyer order settled email; downloadable by the buyer after settlement",
    sentWhen:
      "Generated when the buyer order settled email is sent, and on download from /orders/[id]/invoice/quota after COMPLETED. It is not emailed on its own.",
    trigger:
      "sendSettledOrderInvoice after simulated settlement, or GET /orders/[id]/invoice/quota.",
    recipient:
      "Email attachment to buyer managers. Download for buyer or platform admin after settlement.",
    skipWhen:
      "The order settled email is skipped or fails before attach. Settlement still completes.",
    source: "lib/invoices/tax-invoice.tsx",
    attachments: [],
    related: [
      { id: "order_settled", label: "Order settled email" },
      { id: "tax_invoice_fee", label: "Fee tax invoice PDF" },
    ],
  },
  {
    id: "tax_invoice_fee",
    kind: "pdf",
    name: "Simulated platform fee tax invoice",
    description:
      "Dummy A4 tax invoice for the FQX platform fee: FQX to the seller. Marked as not a real tax invoice. GST is not calculated. The PDF is generated in memory and is not stored.",
    summary: "Attached to the seller order settled email; downloadable by the seller after settlement",
    sentWhen:
      "Generated when the seller order settled email is sent, and on download from /orders/[id]/invoice/fee after COMPLETED. It is not emailed on its own.",
    trigger:
      "sendSettledOrderInvoice after simulated settlement, or GET /orders/[id]/invoice/fee.",
    recipient:
      "Email attachment to seller managers. Download for seller or platform admin after settlement.",
    skipWhen:
      "The order settled email is skipped or fails before attach. Settlement still completes.",
    source: "lib/invoices/tax-invoice.tsx",
    attachments: [],
    related: [
      { id: "order_settled", label: "Order settled email" },
      { id: "tax_invoice_quota", label: "Quota tax invoice PDF" },
    ],
  },
];

const templates: MessageTemplate[] = [...emailTemplates, ...pdfTemplates];

export function isMessageTemplateId(value: string): value is MessageTemplateId {
  return MESSAGE_TEMPLATE_IDS.includes(value as MessageTemplateId);
}

export function listMessageTemplates() {
  return templates;
}

export function getMessageTemplate(id: string) {
  return templates.find((template) => template.id === id) ?? null;
}

export function isEmailTemplateId(id: MessageTemplateId): id is EmailTemplate {
  return isProductEmailId(id);
}

export function sampleEmailData(
  id: EmailTemplate,
  siteUrl: string,
): EmailTemplates[EmailTemplate] {
  return sampleProductEmail(id, siteUrl);
}

export function sampleTaxInvoiceData(kind: TaxInvoiceKind): TaxInvoiceData {
  const order: Order = {
    id: 1001,
    listing_id: 1,
    holding_id: 1,
    seller_organisation_id: 2,
    buyer_organisation_id: 3,
    offering: "SALE",
    quantity: "40",
    unused_quantity: null,
    used_quantity: null,
    unit_price_aud: "18.75",
    amount_aud: "750",
    fee_percent: "5",
    fee_amount_aud: "37.50",
    status: "COMPLETED",
    seller_name: "Sample Quota Holdings Pty Ltd",
    buyer_name: "Sample Fisheries Pty Ltd",
    fishery_name: "Northern Prawn Fishery",
    quota_type_name: "Quota",
    measurement_kind: "WEIGHT",
    unit_label: "kg",
    created_by_email: "buyer@example.com",
    created_at: "2026-08-17T00:00:00.000Z",
    updated_at: "2026-08-17T00:00:00.000Z",
    review_note: null,
    compliance_checklist: [],
  };

  return buildTaxInvoiceData(
    kind,
    order,
    {
      buyerAbn: "81000000002",
      sellerAbn: "81000000001",
    },
    orderChargeAud(order.amount_aud),
  );
}

export function sampleContentFields(id: MessageTemplateId, siteUrl: string) {
  if (isProductEmailId(id)) {
    const data = sampleEmailData(id, siteUrl);
    const fields = [
      { label: "Subject", value: data.subject },
      { label: "Heading", value: data.heading },
      ...data.paragraphs.map((paragraph, index) => ({
        label: `Paragraph ${index + 1}`,
        value: paragraph,
      })),
    ];

    if (data.actionUrl) {
      fields.push({
        label: data.actionLabel ?? "Action",
        value: data.actionUrl,
      });
    }

    return fields;
  }

  const invoice = sampleTaxInvoiceData(
    id === "tax_invoice_fee" ? "fee" : "quota",
  );
  return [
    { label: "Invoice number", value: invoice.invoiceNumber },
    { label: "Title", value: invoice.title },
    { label: "Issued", value: invoice.issuedAt },
    { label: "Order", value: String(invoice.orderId) },
    {
      label: "Supplier",
      value: `${invoice.supplierName} (ABN ${invoice.supplierAbn})`,
    },
    {
      label: "Recipient",
      value: `${invoice.recipientName} (ABN ${invoice.recipientAbn})`,
    },
    {
      label: "Line",
      value: invoice.lines[0]
        ? `${invoice.lines[0].description} — ${invoice.lines[0].amount}`
        : "",
    },
    { label: "Total", value: invoice.total },
    { label: "Note", value: invoice.note },
  ];
}
