import { formatTableDate } from "@/lib/format";
import type { TaxInvoiceData, TaxInvoiceKind } from "@/lib/invoices/types";
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import { formatQuantityWithUsage } from "@/lib/listings/quota-usage";
import type { Order } from "@/lib/orders/types";
import { buyerCardFeeAud, orderSellerPayoutAud } from "@/lib/payments/money";

export const PLATFORM_INVOICE_NAME = "Fisheries Quota Exchange";
export const PLATFORM_INVOICE_ABN = "Not recorded";

function formatAbn(abn: string | null) {
  if (!abn) {
    return "Not recorded";
  }

  const digits = abn.replace(/\s/g, "");

  if (!/^\d{11}$/.test(digits)) {
    return abn;
  }

  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

function invoiceNumber(orderId: number, kind: TaxInvoiceKind) {
  return `FQX-SIM-${orderId}-${kind === "quota" ? "Q" : "F"}`;
}

export function buildTaxInvoiceData(
  kind: TaxInvoiceKind,
  order: Order,
  abns: { buyerAbn: string | null; sellerAbn: string | null },
  chargedAud?: string | number,
): TaxInvoiceData {
  const charge =
    chargedAud == null ? Number(order.amount_aud) : Number(chargedAud);
  const paidAud = Number.isFinite(charge) ? charge : Number(order.amount_aud);
  const cardFee = buyerCardFeeAud(
    order.amount_aud,
    order.fee_amount_aud,
    paidAud,
  );
  const sellerProceeds = orderSellerPayoutAud(
    order.amount_aud,
    order.fee_amount_aud,
    chargedAud == null ? undefined : paidAud,
  );
  const offeringLabel = listingOfferingLabel(order.offering);
  const issuedAt = formatTableDate(order.updated_at);

  if (kind === "quota") {
    const amount = formatAud(order.amount_aud);
    const cardNote =
      cardFee > 0
        ? ` Card processing of ${formatAud(cardFee)} was collected by FQX and is not part of this invoice.`
        : "";

    return {
      kind,
      invoiceNumber: invoiceNumber(order.id, kind),
      issuedAt,
      orderId: order.id,
      title: "Simulated quota tax invoice",
      supplierName: order.seller_name,
      supplierAbn: formatAbn(abns.sellerAbn),
      recipientName: order.buyer_name,
      recipientAbn: formatAbn(abns.buyerAbn),
      lines: [
        {
          description: `${offeringLabel} — ${order.fishery_name}`,
          quantity: formatQuantityWithUsage(
            order.quantity,
            order.unit_label,
            order.unused_quantity,
            order.used_quantity,
          ),
          unitPrice: formatAud(order.unit_price_aud),
          amount,
        },
      ],
      total: amount,
      note: `Payment was collected by FQX on behalf of the supplier.${cardNote} GST is not calculated.`,
    };
  }

  const feeAmount = formatAud(order.fee_amount_aud);

  return {
    kind,
    invoiceNumber: invoiceNumber(order.id, kind),
    issuedAt,
    orderId: order.id,
    title: "Simulated platform fee tax invoice",
    supplierName: PLATFORM_INVOICE_NAME,
    supplierAbn: PLATFORM_INVOICE_ABN,
    recipientName: order.seller_name,
    recipientAbn: formatAbn(abns.sellerAbn),
    lines: [
      {
        description: `Platform fee (${order.fee_percent}%) — ${offeringLabel} — ${order.fishery_name}`,
        quantity: "1",
        unitPrice: feeAmount,
        amount: feeAmount,
      },
    ],
    total: feeAmount,
    note: `Deducted from the listed quota amount at settlement. Seller proceeds ${formatAud(sellerProceeds)}. GST is not calculated.`,
  };
}
