import type { EmailTemplate, EmailTemplates } from "@/lib/email/types";
import { buildTaxInvoiceData } from "@/lib/invoices/from-order";
import type { TaxInvoiceData, TaxInvoiceKind } from "@/lib/invoices/types";
import type { Order } from "@/lib/orders/types";
import { orderChargeAud } from "@/lib/payments/money";

export const MESSAGE_TEMPLATE_IDS = [
  "member_added",
  "order_settled",
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

const templates: MessageTemplate[] = [
  {
    id: "member_added",
    kind: "email",
    name: "Member added",
    description:
      "Tells a person they have been added to an FQX account and how to log in or register with the same email.",
    summary: "After a person is added to an account",
    sentWhen:
      "Immediately after a membership row is inserted. The person is still added if mail is skipped or fails.",
    trigger:
      "Account Owner or Admin submits Add person on /dashboard/members. addMemberAction inserts organisation_users, then sendEmail({ template: \"member_added\" }).",
    recipient:
      "The new member’s email from the membership row (lowercased). Not a separate address from the browser.",
    skipWhen:
      "RESEND_API_KEY or EMAIL_FROM is missing, the site URL cannot be resolved, or Resend rejects the send (for example an unverified from-domain, or a recipient other than the Resend account while using the onboarding sender).",
    source: "lib/email/templates/member-added.tsx",
    attachments: [],
    related: [],
  },
  {
    id: "order_settled",
    kind: "email",
    name: "Order settled",
    description:
      "Confirms simulated settlement and attaches dummy tax invoice PDFs for the quota and the platform fee.",
    summary: "After simulated settlement completes",
    sentWhen:
      "After simulate_settlement succeeds and the order status is COMPLETED. Settlement still completes if mail is skipped or fails.",
    trigger:
      "Platform admin clicks Simulate settlement on /admin/orders. simulateSettlementAction runs simulate_settlement, then sendSettledOrderInvoice.",
    recipient:
      "orders.created_by_email — the buyer who placed the order.",
    skipWhen:
      "RESEND_API_KEY or EMAIL_FROM is missing, the order is not COMPLETED, created_by_email is invalid, or Resend rejects the send.",
    source: "lib/email/templates/order-settled.tsx",
    attachments: ["tax_invoice_quota", "tax_invoice_fee"],
    related: [
      { id: "tax_invoice_quota", label: "Quota tax invoice PDF" },
      { id: "tax_invoice_fee", label: "Fee tax invoice PDF" },
    ],
  },
  {
    id: "tax_invoice_quota",
    kind: "pdf",
    name: "Simulated quota tax invoice",
    description:
      "Dummy A4 tax invoice for the quota: seller to buyer for the listed amount. Marked as not a real tax invoice. GST is not calculated. The PDF is generated in memory and is not stored.",
    summary: "Attached to the order settled email; downloadable after settlement",
    sentWhen:
      "Generated when the order settled email is sent, and on download from /orders/[id]/invoice/quota after COMPLETED. It is not emailed on its own.",
    trigger:
      "sendSettledOrderInvoice after simulated settlement, or GET /orders/[id]/invoice/quota. generateTaxInvoicePdf renders lib/invoices/tax-invoice.tsx.",
    recipient:
      "Email attachment to the buyer (created_by_email). Download for buyer, seller, or platform admin after settlement.",
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
    summary: "Attached to the order settled email; downloadable after settlement",
    sentWhen:
      "Generated when the order settled email is sent, and on download from /orders/[id]/invoice/fee after COMPLETED. It is not emailed on its own.",
    trigger:
      "sendSettledOrderInvoice after simulated settlement, or GET /orders/[id]/invoice/fee. generateTaxInvoicePdf renders lib/invoices/tax-invoice.tsx.",
    recipient:
      "Email attachment to the buyer (created_by_email). Download for buyer, seller, or platform admin after settlement.",
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
  return id === "member_added" || id === "order_settled";
}

export function sampleEmailData(
  id: "member_added",
  siteUrl: string,
): EmailTemplates["member_added"];
export function sampleEmailData(
  id: "order_settled",
  siteUrl: string,
): EmailTemplates["order_settled"];
export function sampleEmailData(
  id: EmailTemplate,
  siteUrl: string,
): EmailTemplates[EmailTemplate];
export function sampleEmailData(id: EmailTemplate, siteUrl: string) {
  if (id === "member_added") {
    return {
      accountName: "Sample Fisheries Pty Ltd",
      role: "Member",
      registerUrl: `${siteUrl}/register`,
      loginUrl: `${siteUrl}/login`,
    } satisfies EmailTemplates["member_added"];
  }

  return {
    orderId: 1001,
    buyerName: "Sample Fisheries Pty Ltd",
    offeringLabel: "Sale",
    amount: "$750.00",
    orderUrl: `${siteUrl}/orders/1001`,
  } satisfies EmailTemplates["order_settled"];
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
  if (id === "member_added") {
    const data = sampleEmailData("member_added", siteUrl);
    return [
      { label: "Account", value: data.accountName },
      { label: "Role", value: data.role },
      { label: "Login URL", value: data.loginUrl },
      { label: "Register URL", value: data.registerUrl },
    ];
  }

  if (id === "order_settled") {
    const data = sampleEmailData("order_settled", siteUrl);
    return [
      { label: "Order", value: String(data.orderId) },
      { label: "Buyer", value: data.buyerName },
      { label: "Offering", value: data.offeringLabel },
      { label: "Total", value: data.amount },
      { label: "Order URL", value: data.orderUrl },
    ];
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
