import "server-only";

import { buildTaxInvoiceData } from "@/lib/invoices/from-order";
import { generateTaxInvoicePdf } from "@/lib/invoices/generate";
import type { TaxInvoiceData } from "@/lib/invoices/types";
import { getOrder } from "@/lib/orders/queries";
import { getPaymentForOrder } from "@/lib/payments/queries";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function getSettledOrderInvoice(orderId: number): Promise<{
  data: TaxInvoiceData;
  pdf: Buffer;
  filename: string;
} | null> {
  const order = await getOrder(orderId);

  if (!order || order.status !== "COMPLETED") {
    return null;
  }

  const userClient = await createClient();
  const supabase = createServiceClient() ?? userClient;

  if (!supabase) {
    return null;
  }

  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, abn")
    .in("id", [order.buyer_organisation_id, order.seller_organisation_id]);

  const abnById = new Map(
    (orgs ?? []).map((row) => [Number(row.id), (row.abn as string | null) ?? null]),
  );
  const payment = await getPaymentForOrder(order.id);
  const data = buildTaxInvoiceData(
    order,
    {
      buyerAbn: abnById.get(order.buyer_organisation_id) ?? null,
      sellerAbn: abnById.get(order.seller_organisation_id) ?? null,
    },
    payment?.status === "PAID" ? payment.amount_aud : undefined,
  );
  const pdf = await generateTaxInvoicePdf(data);

  return {
    data,
    pdf,
    filename: `${data.invoiceNumber}.pdf`,
  };
}
