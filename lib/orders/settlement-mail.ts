import "server-only";

import { sendEmail } from "@/lib/email/send";
import { getSettledOrderInvoices } from "@/lib/invoices/for-order";
import { listingOfferingLabel } from "@/lib/listings/types";
import { getOrder } from "@/lib/orders/queries";
import { getSiteUrl } from "@/lib/site-url";

export async function sendSettledOrderInvoice(orderId: number) {
  const order = await getOrder(orderId);
  const invoices = await getSettledOrderInvoices(orderId);

  if (!order || !invoices) {
    return;
  }

  const to = order.created_by_email.trim().toLowerCase();

  if (!to.includes("@")) {
    return;
  }

  const siteUrl = await getSiteUrl();

  await sendEmail({
    to,
    template: "order_settled",
    data: {
      orderId: order.id,
      buyerName: order.buyer_name,
      offeringLabel: listingOfferingLabel(order.offering),
      amount: invoices.quota.data.total,
      orderUrl: siteUrl ? `${siteUrl}/orders/${order.id}` : "",
    },
    attachments: [
      {
        filename: invoices.quota.filename,
        content: invoices.quota.pdf,
      },
      {
        filename: invoices.fee.filename,
        content: invoices.fee.pdf,
      },
    ],
  });
}
