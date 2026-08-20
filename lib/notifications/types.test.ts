import assert from "node:assert/strict";
import test from "node:test";
import { inAppNotificationBody, parseInAppMessage } from "./types.ts";

test("inAppNotificationBody joins every paragraph so admin notes are kept", () => {
  assert.equal(
    inAppNotificationBody({
      paragraphs: [
        "Compliance review is still open.",
        "Update your details on Business Settings.",
      ],
      preview: "FQX needs an update",
    }),
    [
      "Compliance review is still open.",
      "Update your details on Business Settings.",
    ].join("\n\n"),
  );
});

test("inAppNotificationBody stores a highlight separately from boilerplate", () => {
  assert.equal(
    inAppNotificationBody({
      highlight: "We need more details",
      paragraphs: ["Compliance review is still open."],
    }),
    JSON.stringify({
      highlight: "We need more details",
      body: "Compliance review is still open.",
    }),
  );
});

test("inAppNotificationBody falls back to preview when paragraphs are empty", () => {
  assert.equal(
    inAppNotificationBody({ paragraphs: ["  "], preview: "Payment received" }),
    "Payment received",
  );
});

test("parseInAppMessage reads a stored highlight", () => {
  assert.deepEqual(
    parseInAppMessage(
      JSON.stringify({
        highlight: "We need more details",
        body: "Compliance review is still open.",
      }),
    ),
    {
      highlight: "We need more details",
      message: "Compliance review is still open.",
    },
  );
});

test("parseInAppMessage splits legacy compliance-update bodies", () => {
  assert.deepEqual(
    parseInAppMessage(
      [
        "We need more details",
        "Compliance review is still open.",
        "Update your details on Business Settings.",
      ].join("\n\n"),
      "compliance_update_requested",
    ),
    {
      highlight: "We need more details",
      message: [
        "Compliance review is still open.",
        "Update your details on Business Settings.",
      ].join("\n\n"),
    },
  );
});
