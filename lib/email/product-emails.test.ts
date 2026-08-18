import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_EMAIL_IDS,
  disabledProductEmails,
  emailIsDisabled,
  isProductEmailId,
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

test("known ids are product emails", () => {
  for (const id of PRODUCT_EMAIL_IDS) {
    assert.equal(isProductEmailId(id), true);
  }
  assert.equal(isProductEmailId("tax_invoice_quota"), false);
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
