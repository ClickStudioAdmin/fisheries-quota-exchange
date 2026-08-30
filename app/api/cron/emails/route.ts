import { NextResponse } from "next/server";
import { runScheduledEmails } from "@/lib/email/jobs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScheduledEmails();
  return NextResponse.json(result);
}
