import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/payments/webhook";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  if (!signature) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  try {
    await handleStripeWebhook(payload, signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed.";
    console.error("stripe webhook failed", message);
    return new NextResponse(message, { status: 400 });
  }
}
