import assert from "node:assert/strict";
import test from "node:test";
import {
  getPandaDocSandboxRecipients,
  pandadocApiRecipientEmail,
  plusTaggedSandboxEmails,
} from "./sandbox-recipients.ts";

test("plusTaggedSandboxEmails derives two live.com aliases from one address", () => {
  assert.deepEqual(plusTaggedSandboxEmails("timg_81@live.com"), {
    sellerEmail: "timg_81+fqx-seller@live.com",
    buyerEmail: "timg_81+fqx-buyer@live.com",
  });
  assert.deepEqual(plusTaggedSandboxEmails("timg_81+other@live.com"), {
    sellerEmail: "timg_81+fqx-seller@live.com",
    buyerEmail: "timg_81+fqx-buyer@live.com",
  });
  assert.equal(plusTaggedSandboxEmails("not-an-email"), null);
});

test("pandadocApiRecipientEmail uses sandbox aliases only when configured", () => {
  const previousShared = process.env.PANDADOC_SANDBOX_RECIPIENT_EMAIL;
  const previousSeller = process.env.PANDADOC_SANDBOX_SELLER_EMAIL;
  const previousBuyer = process.env.PANDADOC_SANDBOX_BUYER_EMAIL;
  delete process.env.PANDADOC_SANDBOX_RECIPIENT_EMAIL;
  delete process.env.PANDADOC_SANDBOX_SELLER_EMAIL;
  delete process.env.PANDADOC_SANDBOX_BUYER_EMAIL;

  try {
    assert.equal(
      pandadocApiRecipientEmail("Seller", "seller@example.com"),
      "seller@example.com",
    );

    process.env.PANDADOC_SANDBOX_RECIPIENT_EMAIL = "timg_81@live.com";
    assert.equal(
      pandadocApiRecipientEmail("Seller", "seller@example.com"),
      "timg_81+fqx-seller@live.com",
    );
    assert.equal(
      pandadocApiRecipientEmail("Buyer", "buyer@example.com"),
      "timg_81+fqx-buyer@live.com",
    );

    process.env.PANDADOC_SANDBOX_SELLER_EMAIL = "a@live.com";
    process.env.PANDADOC_SANDBOX_BUYER_EMAIL = "b@live.com";
    assert.deepEqual(getPandaDocSandboxRecipients(), {
      sellerEmail: "a@live.com",
      buyerEmail: "b@live.com",
    });
  } finally {
    if (previousShared == null) {
      delete process.env.PANDADOC_SANDBOX_RECIPIENT_EMAIL;
    } else {
      process.env.PANDADOC_SANDBOX_RECIPIENT_EMAIL = previousShared;
    }
    if (previousSeller == null) {
      delete process.env.PANDADOC_SANDBOX_SELLER_EMAIL;
    } else {
      process.env.PANDADOC_SANDBOX_SELLER_EMAIL = previousSeller;
    }
    if (previousBuyer == null) {
      delete process.env.PANDADOC_SANDBOX_BUYER_EMAIL;
    } else {
      process.env.PANDADOC_SANDBOX_BUYER_EMAIL = previousBuyer;
    }
  }
});
