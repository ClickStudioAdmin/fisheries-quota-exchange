import "server-only";

import { sendEmail } from "@/lib/email/send";
import { buildTaxInvoiceData } from "@/lib/invoices/from-order";
import { generateTaxInvoicePdf } from "@/lib/invoices/generate";
import { listingOfferingLabel } from "@/lib/listings/types";
import { getOrder } from "@/lib/orders/queries";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export async function sendSettledOrderInvoice(orderId: number) {
  const order = await getOrder(orderId);

  if (!order || order.status !== "COMPLETED") {
    return;
  }

  const to = order.created_by_email.trim().toLowerCase();

  if (!to.includes("@")) {
    return;
  }

  const supabase = await createClient();

  if (!supabase) {
    return;
  }

  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, abn")
    .in("id", [order.buyer_organisation_id, order.seller_organisation_id]);

  const abnById = new Map(
    (orgs ?? []).map((row) => [Number(row.id), (row.abn as string | null) ?? null]),
  );
  const invoice = buildTaxInvoiceData(order, {
    buyerAbn: abnById.get(order.buyer_organisation_id) ?? null,
    sellerAbn: abnById.get(order.seller_organisation_id) ?? null,
  });
  const pdf = await generateTaxInvoicePdf(invoice);
  const siteUrl = await getSiteUrl();

  await sendEmail({
    to,
    template: "order_settled",
    data: {
      orderId: order.id,
      buyerName: order.buyer_name,
      offeringLabel: listingOfferingLabel(order.offering),
      amount: invoice.total,
      orderUrl: siteUrl ? `${siteUrl}/orders/${order.id}` : "",
    },
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdf,
      },
    ],
  });
}
