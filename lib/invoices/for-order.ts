import "server-only";

import { buildTaxInvoiceData } from "@/lib/invoices/from-order";
import { generateTaxInvoicePdf } from "@/lib/invoices/generate";
import type { TaxInvoiceData, TaxInvoiceKind } from "@/lib/invoices/types";
import { getOrder } from "@/lib/orders/queries";
import type { Order } from "@/lib/orders/types";
import { getPaymentForOrder } from "@/lib/payments/queries";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type SettledTaxInvoice = {
  data: TaxInvoiceData;
  pdf: Buffer;
  filename: string;
};

type InvoiceContext = {
  order: Order;
  abns: { buyerAbn: string | null; sellerAbn: string | null };
  chargedAud?: string | number;
};

async function loadSettledInvoiceContext(
  orderId: number,
): Promise<InvoiceContext | null> {
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

  return {
    order,
    abns: {
      buyerAbn: abnById.get(order.buyer_organisation_id) ?? null,
      sellerAbn: abnById.get(order.seller_organisation_id) ?? null,
    },
    chargedAud: payment?.status === "PAID" ? payment.amount_aud : undefined,
  };
}

async function renderInvoice(
  context: InvoiceContext,
  kind: TaxInvoiceKind,
): Promise<SettledTaxInvoice> {
  const data = buildTaxInvoiceData(
    kind,
    context.order,
    context.abns,
    context.chargedAud,
  );
  const pdf = await generateTaxInvoicePdf(data);

  return {
    data,
    pdf,
    filename: `${data.invoiceNumber}.pdf`,
  };
}

export async function getSettledOrderInvoice(
  orderId: number,
  kind: TaxInvoiceKind,
): Promise<SettledTaxInvoice | null> {
  const context = await loadSettledInvoiceContext(orderId);

  if (!context) {
    return null;
  }

  return renderInvoice(context, kind);
}

export async function getSettledOrderInvoices(orderId: number): Promise<{
  quota: SettledTaxInvoice;
  fee: SettledTaxInvoice;
} | null> {
  const context = await loadSettledInvoiceContext(orderId);

  if (!context) {
    return null;
  }

  const [quota, fee] = await Promise.all([
    renderInvoice(context, "quota"),
    renderInvoice(context, "fee"),
  ]);

  return { quota, fee };
}
