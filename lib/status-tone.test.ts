import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_STATUS_TONE_CLASS,
  IN_REVIEW_STATUS_TONE_CLASS,
  WAITING_STATUS_TONE_CLASS,
  statusToneClass,
} from "./status-tone.ts";

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
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "2 of 4 · Waiting for signatures"),
    ACTION_STATUS_TONE_CLASS,
  );
  assert.equal(statusToneClass("Unread"), ACTION_STATUS_TONE_CLASS);
});

test("in-progress transfer statuses use the sea in-review tone", () => {
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "3 of 6 · Checking seller signed form"),
    IN_REVIEW_STATUS_TONE_CLASS,
  );
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "5 of 6 · Reviewing completed pack"),
    IN_REVIEW_STATUS_TONE_CLASS,
  );
  assert.equal(
    statusToneClass("AWAITING_TRANSFER", "6 of 6 · With Fisheries Queensland"),
    IN_REVIEW_STATUS_TONE_CLASS,
  );
  assert.equal(
    statusToneClass("AWAITING_SELLER_PACK_REVIEW"),
    IN_REVIEW_STATUS_TONE_CLASS,
  );
  assert.equal(statusToneClass("ADMIN_REVIEW"), IN_REVIEW_STATUS_TONE_CLASS);
  assert.equal(statusToneClass("SUBMITTED"), IN_REVIEW_STATUS_TONE_CLASS);
  assert.equal(statusToneClass("PROCESSING"), IN_REVIEW_STATUS_TONE_CLASS);
});

test("waiting-on-next-step statuses stay muted", () => {
  assert.equal(statusToneClass("AWAITING_TRANSFER"), WAITING_STATUS_TONE_CLASS);
  assert.equal(statusToneClass("AWAITING_COMPLIANCE"), WAITING_STATUS_TONE_CLASS);
  assert.equal(statusToneClass("AWAITING_SETTLEMENT"), WAITING_STATUS_TONE_CLASS);
});
