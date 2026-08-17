import type { EmailTemplate, EmailTemplates } from "@/lib/email/types";
import type { TaxInvoiceData } from "@/lib/invoices/types";

export const MESSAGE_TEMPLATE_IDS = [
  "member_added",
  "order_settled",
  "tax_invoice",
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
      "Confirms simulated settlement and attaches the dummy tax invoice PDF. No live payment.",
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
    attachments: ["tax_invoice"],
    related: [{ id: "tax_invoice", label: "Simulated tax invoice PDF" }],
  },
  {
    id: "tax_invoice",
    kind: "pdf",
    name: "Simulated tax invoice",
    description:
      "Dummy A4 tax invoice for a simulated quota sale or lease. Marked as not a real tax invoice. GST is not calculated. The PDF is generated in memory and is not stored.",
    summary: "Attached to the order settled email",
    sentWhen:
      "Generated when the order settled email is sent. It is not emailed on its own.",
    trigger:
      "sendSettledOrderInvoice after simulated settlement. generateTaxInvoicePdf renders lib/invoices/tax-invoice.tsx and Resend attaches FQX-SIM-{order id}.pdf.",
    recipient:
      "Attached to the order settled email (buyer created_by_email).",
    skipWhen:
      "The order settled email is skipped or fails before attach. Settlement still completes.",
    source: "lib/invoices/tax-invoice.tsx",
    attachments: [],
    related: [{ id: "order_settled", label: "Order settled email" }],
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
    amount: "$787.50",
    orderUrl: `${siteUrl}/orders/1001`,
  } satisfies EmailTemplates["order_settled"];
}

export function sampleTaxInvoiceData(): TaxInvoiceData {
  return {
    invoiceNumber: "FQX-SIM-1001",
    issuedAt: "17/08/2026",
    orderId: 1001,
    offeringLabel: "Sale",
    fisheryName: "Northern Prawn Fishery",
    quantityLabel: "40 kg",
    unitPrice: "$18.75",
    amount: "$750.00",
    feePercent: "5%",
    feeAmount: "$37.50",
    total: "$787.50",
    sellerName: "Sample Quota Holdings Pty Ltd",
    sellerAbn: "81 000 000 001",
    buyerName: "Sample Fisheries Pty Ltd",
    buyerAbn: "81 000 000 002",
  };
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
      { label: "Type", value: data.offeringLabel },
      { label: "Total", value: data.amount },
      { label: "Order URL", value: data.orderUrl },
    ];
  }

  const invoice = sampleTaxInvoiceData();
  return [
    { label: "Invoice number", value: invoice.invoiceNumber },
    { label: "Issued", value: invoice.issuedAt },
    { label: "Order", value: String(invoice.orderId) },
    { label: "Supplier", value: `${invoice.sellerName} (ABN ${invoice.sellerAbn})` },
    { label: "Recipient", value: `${invoice.buyerName} (ABN ${invoice.buyerAbn})` },
    { label: "Line", value: `${invoice.offeringLabel} — ${invoice.fisheryName}` },
    { label: "Quantity", value: invoice.quantityLabel },
    { label: "Unit price", value: invoice.unitPrice },
    { label: "Quota amount", value: invoice.amount },
    { label: "Platform fee", value: `${invoice.feeAmount} (${invoice.feePercent})` },
    { label: "Total AUD", value: invoice.total },
  ];
}
