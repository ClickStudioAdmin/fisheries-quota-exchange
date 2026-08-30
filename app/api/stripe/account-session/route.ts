import { NextResponse } from "next/server";
import { createAccountSessionAction } from "@/lib/payments/actions";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    organisationId?: number;
  } | null;
  const organisationId = Number(body?.organisationId);

  if (!Number.isInteger(organisationId)) {
    return NextResponse.json({ error: "Account required." }, { status: 400 });
  }

  const result = await createAccountSessionAction(organisationId);

  if (result.error || !result.clientSecret) {
    return NextResponse.json(
      { error: result.error ?? "Could not start Stripe." },
      { status: 400 },
    );
  }

  return NextResponse.json({ clientSecret: result.clientSecret });
}
