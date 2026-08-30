import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { verifyPandaDocSignature } from "./verify.ts";

test("verifyPandaDocSignature rejects missing or wrong signatures", () => {
  const previousKey = process.env.PANDADOC_WEBHOOK_SHARED_KEY;
  const previousApi = process.env.PANDADOC_API_KEY;
  process.env.PANDADOC_API_KEY = "test-key";
  process.env.PANDADOC_WEBHOOK_SHARED_KEY = "shared-secret";
  try {
    const payload = JSON.stringify([{ event: "recipient_completed" }]);
    const signature = createHmac("sha256", "shared-secret")
      .update(payload)
      .digest("hex");
    assert.equal(verifyPandaDocSignature(payload, signature), true);
    assert.equal(verifyPandaDocSignature(payload, `sha256=${signature}`), true);
    assert.equal(verifyPandaDocSignature(payload, "deadbeef"), false);
    assert.equal(verifyPandaDocSignature(payload, null), false);
    assert.equal(
      verifyPandaDocSignature(payload, createHmac("sha256", "other").update(payload).digest("hex")),
      false,
    );
  } finally {
    if (previousKey == null) {
      delete process.env.PANDADOC_WEBHOOK_SHARED_KEY;
    } else {
      process.env.PANDADOC_WEBHOOK_SHARED_KEY = previousKey;
    }
    if (previousApi == null) {
      delete process.env.PANDADOC_API_KEY;
    } else {
      process.env.PANDADOC_API_KEY = previousApi;
    }
  }
});
