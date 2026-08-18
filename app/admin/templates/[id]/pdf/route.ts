import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/admin/access";
import { generateTaxInvoicePdf } from "@/lib/invoices/generate";
import { getMessageTemplate, sampleTaxInvoiceData } from "@/lib/templates/catalog";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isPlatformAdmin())) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await context.params;
  const template = getMessageTemplate(id);

  if (!template || template.kind !== "pdf") {
    return new NextResponse("Not found", { status: 404 });
  }

  const invoice = sampleTaxInvoiceData(
    template.id === "tax_invoice_fee" ? "fee" : "quota",
  );
  const pdf = await generateTaxInvoicePdf(invoice);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
