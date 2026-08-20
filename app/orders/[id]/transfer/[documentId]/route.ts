import { NextResponse } from "next/server";
import { loginPath } from "@/lib/auth/paths";
import { getUser } from "@/lib/supabase/server";
import { getTransferDocumentFile } from "@/lib/transfers/queries";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await context.params;
  const user = await getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(loginPath(`/orders/${id}`), request.url),
    );
  }

  const orderId = Number(id);
  const fileId = Number(documentId);

  if (!Number.isInteger(orderId) || !Number.isInteger(fileId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await getTransferDocumentFile(orderId, fileId);

  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
