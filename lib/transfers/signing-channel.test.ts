import assert from "node:assert/strict";
import test from "node:test";
import {
  isPandadocChannel,
  parseSigningChannel,
  signingChannelLabel,
} from "./signing-channel.ts";

test("parseSigningChannel accepts only OFFLINE and PANDADOC", () => {
  assert.equal(parseSigningChannel("OFFLINE"), "OFFLINE");
  assert.equal(parseSigningChannel("PANDADOC"), "PANDADOC");
  assert.equal(parseSigningChannel("ONLINE"), null);
  assert.equal(parseSigningChannel(null), null);
  assert.equal(isPandadocChannel("PANDADOC"), true);
  assert.equal(isPandadocChannel("OFFLINE"), false);
  assert.equal(signingChannelLabel("PANDADOC"), "Sign online");
});
