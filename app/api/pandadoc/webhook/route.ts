import { NextResponse } from "next/server";
import { handlePandaDocWebhook } from "@/lib/pandadoc/signing";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const signature =
    request.headers.get("x-pandadoc-signature") ??
    url.searchParams.get("signature");
  const payload = await request.text();

  try {
    await handlePandaDocWebhook(payload, signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed.";
    console.error("pandadoc webhook failed", message);
    return new NextResponse(message, { status: 400 });
  }
}
