import assert from "node:assert/strict";
import test from "node:test";
import {
  buyerCardFeeAud,
  buyerPaidPlatformFeeOnTop,
  orderChargeAud,
  orderCheckoutChargeAud,
  orderSellerPayoutAud,
  stripeCardFeeAud,
} from "./money.ts";

test("card fee is grossed up so the listed amount still reaches FQX", () => {
  const listed = 2000;
  const fee = stripeCardFeeAud(listed);
  const charge = orderChargeAud(listed);

  assert.equal(charge, listed + fee);
  assert.ok(fee > 0);
  assert.equal(Math.round(charge * 100), 203593);
});

test("seller payout deducts the platform fee when the buyer paid the card surcharge", () => {
  assert.equal(orderSellerPayoutAud(2000, 50, orderChargeAud(2000)), 1950);
});

test("seller payout is the listed amount for the old buyer-pays-platform-fee charge", () => {
  assert.equal(orderSellerPayoutAud(2000, 50, 2050), 2000);
  assert.equal(buyerPaidPlatformFeeOnTop(2000, 50, 2050), true);
  assert.equal(buyerCardFeeAud(2000, 50, 2050), 0);
});

test("seller payout deducts the platform fee when the charge equals the listed amount", () => {
  assert.equal(orderSellerPayoutAud(2000, 50, 2000), 1950);
  assert.equal(buyerCardFeeAud(2000, 50, 2000), 0);
});

test("bank debit charges the listed amount and card adds Stripe processing", () => {
  assert.equal(orderCheckoutChargeAud(2000, "becs"), 2000);
  assert.equal(orderCheckoutChargeAud(2000, "card"), orderChargeAud(2000));
});
