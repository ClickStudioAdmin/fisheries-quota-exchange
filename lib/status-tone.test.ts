import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_STATUS_TONE_CLASS, statusToneClass } from "./status-tone.ts";

test("party-action statuses use the bright amber alert tone", () => {
  assert.equal(statusToneClass("AWAITING_PAYMENT"), ACTION_STATUS_TONE_CLASS);
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "1 of 4 · Waiting for application"),
    ACTION_STATUS_TONE_CLASS,
  );
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "2 of 4 · Waiting for signed documents"),
    ACTION_STATUS_TONE_CLASS,
  );
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "Action required"),
    ACTION_STATUS_TONE_CLASS,
  );
  assert.equal(statusToneClass("Unread"), ACTION_STATUS_TONE_CLASS);
});

test("waiting-on-FQX statuses stay muted", () => {
  assert.equal(statusToneClass("AWAITING_TRANSFER"), "bg-line text-ink");
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "3 of 4 · Reviewing signed pack"),
    "bg-line text-ink",
  );
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "4 of 4 · With Fisheries Queensland"),
    "bg-line text-ink",
  );
  assert.equal(statusToneClass("AWAITING_COMPLIANCE"), "bg-line text-ink");
  assert.equal(statusToneClass("AWAITING_SETTLEMENT"), "bg-line text-ink");
});
