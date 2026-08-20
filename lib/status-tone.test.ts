import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_STATUS_TONE_CLASS, statusToneClass } from "./status-tone.ts";

test("party-action statuses use the bright amber alert tone", () => {
  assert.equal(statusToneClass("AWAITING_PAYMENT"), ACTION_STATUS_TONE_CLASS);
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "1 of 6 · Waiting for application"),
    ACTION_STATUS_TONE_CLASS,
  );
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "2 of 6 · Waiting for seller to sign"),
    ACTION_STATUS_TONE_CLASS,
  );
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "4 of 6 · Waiting for buyer to sign"),
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
    statusToneClass("AWAITING_TRANSFER", "3 of 6 · Checking seller signed form"),
    "bg-line text-ink",
  );
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "5 of 6 · Reviewing completed pack"),
    "bg-line text-ink",
  );
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "6 of 6 · With Fisheries Queensland"),
    "bg-line text-ink",
  );
  assert.equal(statusToneClass("AWAITING_COMPLIANCE"), "bg-line text-ink");
  assert.equal(statusToneClass("AWAITING_SETTLEMENT"), "bg-line text-ink");
});
