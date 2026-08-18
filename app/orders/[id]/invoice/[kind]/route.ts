import { NextResponse } from "next/server";
import { loginPath } from "@/lib/auth/paths";
import { getSettledOrderInvoice } from "@/lib/invoices/for-order";
import { isTaxInvoiceKind } from "@/lib/invoices/types";
import { getUser } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  const { id, kind } = await context.params;
  const user = await getUser();

  if (!user) {
    return NextResponse.redirect(new URL(loginPath(`/orders/${id}`), request.url));
  }

  const orderId = Number(id);

  if (!Number.isInteger(orderId) || !isTaxInvoiceKind(kind)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const invoice = await getSettledOrderInvoice(orderId, kind);

  if (!invoice) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(invoice.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.filename}"`,
    },
  });
}
