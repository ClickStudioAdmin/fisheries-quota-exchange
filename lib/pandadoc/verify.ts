import { createHmac, timingSafeEqual } from "node:crypto";
import { getPandaDocEnv } from "./env";

export function verifyPandaDocSignature(
  payload: string,
  signature: string | null,
) {
  const sharedKey = getPandaDocEnv()?.webhookSharedKey;
  if (!sharedKey || !signature) {
    return false;
  }

  const expected = createHmac("sha256", sharedKey).update(payload).digest("hex");
  const received = signature.trim().toLowerCase().replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
