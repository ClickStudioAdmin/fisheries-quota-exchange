import "server-only";

import { emailCopy } from "@/lib/email/copy";
import { notifyAccountEmail, notifyActorAndAccountEmail, siteUrlOrEmpty } from "@/lib/email/notify";
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
  const attachments = [
    {
      filename: invoices.quota.filename,
      content: invoices.quota.pdf,
    },
    {
      filename: invoices.fee.filename,
      content: invoices.fee.pdf,
    },
  ];

  await notifyActorAndAccountEmail(
    "order_settled",
    order.buyer_organisation_id,
    order.created_by_email,
    emailCopy.order_settled({
      orderId: order.id,
      offeringLabel,
      amount,
      orderUrl,
      forSeller: false,
    }),
    attachments,
  );
  await notifyAccountEmail(
    "order_settled",
    order.seller_organisation_id,
    emailCopy.order_settled({
      orderId: order.id,
      offeringLabel,
      amount,
      orderUrl,
      forSeller: true,
    }),
    undefined,
    attachments,
  );
}
