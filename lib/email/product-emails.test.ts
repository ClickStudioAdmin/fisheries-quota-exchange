import assert from "node:assert/strict";
import test from "node:test";
import {
  MEMBER_EMAIL_IDS,
  PRODUCT_EMAIL_IDS,
  disabledProductEmails,
  emailIsDisabled,
  isAccountNotificationEmailId,
  isProductEmailId,
  personalNotificationEmailIds,
} from "./product-emails.ts";
import { emailCopy } from "./copy.ts";

test("emailIsDisabled matches saved platform settings", () => {
  assert.equal(emailIsDisabled(["bid_placed"], "bid_placed"), true);
  assert.equal(emailIsDisabled(["bid_placed"], "listing_published"), false);
  assert.equal(emailIsDisabled([], "order_settled"), false);
});

test("disabledProductEmails is the unchecked remainder", () => {
  const disabled = disabledProductEmails(["member_added", "order_settled"]);
  assert.equal(disabled.includes("member_added"), false);
  assert.equal(disabled.includes("order_settled"), false);
  assert.equal(disabled.includes("listing_published"), true);
  assert.equal(disabled.length, PRODUCT_EMAIL_IDS.length - 2);
});

test("personalNotificationEmailIds omits mail the person would not receive", () => {
  const none = personalNotificationEmailIds({
    isOrgMember: false,
    isOrgManager: false,
  });
  assert.equal(none.includes("member_added"), true);
  assert.equal(none.includes("listing_alert"), true);
  assert.equal(none.includes("listing_purchased"), false);
  assert.equal(none.includes("purchase_received"), false);
  assert.equal(none.includes("operator_holding_pending"), false);

  const member = personalNotificationEmailIds({
    isOrgMember: true,
    isOrgManager: false,
  });
  assert.equal(member.includes("purchase_received"), true);
  assert.equal(member.includes("bid_placed"), true);
  assert.equal(member.includes("listing_purchased"), false);
  assert.equal(member.includes("holding_verified"), false);
  assert.equal(member.includes("operator_order_pending"), false);

  const manager = personalNotificationEmailIds({
    isOrgMember: true,
    isOrgManager: true,
  });
  assert.equal(manager.includes("listing_purchased"), true);
  assert.equal(manager.includes("holding_verified"), true);
  assert.equal(manager.includes("purchase_received"), true);
  assert.equal(manager.includes("operator_listing_pending"), false);
  assert.equal(manager.length, MEMBER_EMAIL_IDS.length);
});

test("isAccountNotificationEmailId is listing and settlement org mail, not personal mail", () => {
  assert.equal(isAccountNotificationEmailId("holding_verified"), true);
  assert.equal(isAccountNotificationEmailId("listing_purchased"), true);
  assert.equal(isAccountNotificationEmailId("order_settled"), true);
  assert.equal(isAccountNotificationEmailId("listing_alert"), false);
  assert.equal(isAccountNotificationEmailId("purchase_received"), false);
  assert.equal(isAccountNotificationEmailId("member_added"), false);
  assert.equal(isAccountNotificationEmailId("bid_placed"), false);
});

test("settlement copy differs for buyer and seller", () => {
  const input = {
    orderId: 1001,
    offeringLabel: "Sale",
    amount: "$750.00",
    orderUrl: "https://example.test/orders/1001",
    forSeller: false,
  };
  const buyer = emailCopy.order_settled(input);
  const seller = emailCopy.order_settled({ ...input, forSeller: true });
  assert.notEqual(buyer.paragraphs[0], seller.paragraphs[0]);
  assert.match(seller.paragraphs[0] ?? "", /FQX to you/);
});
