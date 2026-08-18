import "server-only";

import { sendEmail } from "@/lib/email/send";
import { getSettledOrderInvoice } from "@/lib/invoices/for-order";
import { listingOfferingLabel } from "@/lib/listings/types";
import { getOrder } from "@/lib/orders/queries";
import { getSiteUrl } from "@/lib/site-url";

export async function sendSettledOrderInvoice(orderId: number) {
  const order = await getOrder(orderId);
  const invoice = await getSettledOrderInvoice(orderId);

  if (!order || !invoice) {
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
      amount: invoice.data.total,
      orderUrl: siteUrl ? `${siteUrl}/orders/${order.id}` : "",
    },
    attachments: [
      {
        filename: invoice.filename,
        content: invoice.pdf,
      },
    ],
  });
}
