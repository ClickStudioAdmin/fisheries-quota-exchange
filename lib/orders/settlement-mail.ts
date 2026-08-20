import "server-only";

import { emailCopy } from "@/lib/email/copy";
import { notifyAccountEmail, siteUrlOrEmpty } from "@/lib/email/notify";
import { getSettledOrderInvoices } from "@/lib/invoices/for-order";
import { listingOfferingLabel } from "@/lib/listings/types";
import { getOrder } from "@/lib/orders/queries";

export async function sendSettledOrderInvoice(orderId: number) {
  const order = await getOrder(orderId);
  const invoices = await getSettledOrderInvoices(orderId);

  if (!order || !invoices) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  const orderUrl = siteUrl ? `${siteUrl}/orders/${order.id}` : "";
  const offeringLabel = listingOfferingLabel(order.offering);
  const amount = invoices.quota.data.total;
  const feeAmount = invoices.fee.data.total;
  const quotaAttachment = {
    filename: invoices.quota.filename,
    content: invoices.quota.pdf,
  };
  const feeAttachment = {
    filename: invoices.fee.filename,
    content: invoices.fee.pdf,
  };

  await notifyAccountEmail(
    "order_settled",
    order.buyer_organisation_id,
    emailCopy.order_settled({
      orderId: order.id,
      offeringLabel,
      amount,
      orderUrl,
      forSeller: false,
    }),
    undefined,
    [quotaAttachment],
  );
  await notifyAccountEmail(
    "order_settled",
    order.seller_organisation_id,
    emailCopy.order_settled({
      orderId: order.id,
      offeringLabel,
      amount: feeAmount,
      orderUrl,
      forSeller: true,
    }),
    undefined,
    [feeAttachment],
  );
}
