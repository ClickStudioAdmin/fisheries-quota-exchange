export const TAX_INVOICE_KINDS = ["quota", "fee"] as const;

export type TaxInvoiceKind = (typeof TAX_INVOICE_KINDS)[number];

export type TaxInvoiceLine = {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

export type TaxInvoiceData = {
  kind: TaxInvoiceKind;
  invoiceNumber: string;
  issuedAt: string;
  orderId: number;
  title: string;
  supplierName: string;
  supplierAbn: string;
  recipientName: string;
  recipientAbn: string;
  lines: TaxInvoiceLine[];
  total: string;
  note: string;
};

export function isTaxInvoiceKind(value: string): value is TaxInvoiceKind {
  return (TAX_INVOICE_KINDS as readonly string[]).includes(value);
}

export function taxInvoicePath(orderId: number, kind: TaxInvoiceKind) {
  return `/orders/${orderId}/invoice/${kind}`;
}
