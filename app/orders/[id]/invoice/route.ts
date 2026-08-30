import { NextResponse } from "next/server";
import { loginPath } from "@/lib/auth/paths";
import { taxInvoicePath } from "@/lib/invoices/types";
import { getUser } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getUser();

  if (!user) {
    return NextResponse.redirect(new URL(loginPath(`/orders/${id}`), request.url));
  }

  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(new URL(taxInvoicePath(orderId, "quota"), request.url));
}
