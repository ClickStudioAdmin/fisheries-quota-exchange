import { formatTableDate } from "@/lib/format";
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import type { TaxInvoiceData } from "@/lib/invoices/types";
import type { Order } from "@/lib/orders/types";
import { orderChargeAud, orderSellerPayoutAud } from "@/lib/payments/money";

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

export function buildTaxInvoiceData(
  order: Order,
  abns: { buyerAbn: string | null; sellerAbn: string | null },
): TaxInvoiceData {
  const charge = orderChargeAud(order.amount_aud);
  const sellerProceeds = orderSellerPayoutAud(
    order.amount_aud,
    order.fee_amount_aud,
  );

  return {
    invoiceNumber: `FQX-SIM-${order.id}`,
    issuedAt: formatTableDate(order.updated_at),
    orderId: order.id,
    offeringLabel: listingOfferingLabel(order.offering),
    fisheryName: order.fishery_name,
    quantityLabel: `${order.quantity} ${order.unit_label}`,
    unitPrice: formatAud(order.unit_price_aud),
    amount: formatAud(order.amount_aud),
    feePercent: `${order.fee_percent}%`,
    feeAmount: formatAud(order.fee_amount_aud),
    sellerProceeds: formatAud(sellerProceeds),
    total: formatAud(Number.isFinite(charge) ? charge : order.amount_aud),
    sellerName: order.seller_name,
    sellerAbn: formatAbn(abns.sellerAbn),
    buyerName: order.buyer_name,
    buyerAbn: formatAbn(abns.buyerAbn),
  };
}
