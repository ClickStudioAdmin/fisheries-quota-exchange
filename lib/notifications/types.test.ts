import assert from "node:assert/strict";
import test from "node:test";
import { inAppNotificationBody } from "./types.ts";

test("inAppNotificationBody joins every paragraph so admin notes are kept", () => {
  assert.equal(
    inAppNotificationBody({
      paragraphs: [
        "Compliance review is still open.",
        "We need more details",
        "Update your details on Business Settings.",
      ],
      preview: "FQX needs an update",
    }),
    [
      "Compliance review is still open.",
      "We need more details",
      "Update your details on Business Settings.",
    ].join("\n\n"),
  );
});

test("inAppNotificationBody falls back to preview when paragraphs are empty", () => {
  assert.equal(
    inAppNotificationBody({ paragraphs: ["  "], preview: "Payment received" }),
    "Payment received",
  );
});
