import assert from "node:assert/strict";
import test from "node:test";
import {
  BUYER_BID_ACKNOWLEDGEMENTS,
  BUYER_PURCHASE_ACKNOWLEDGEMENTS,
  SELLER_ACKNOWLEDGEMENTS,
  missingAcknowledgements,
  requireAcknowledgements,
} from "./acknowledgements.ts";

test("seller and buyer acknowledgements each have distinct names", () => {
  for (const group of [
    SELLER_ACKNOWLEDGEMENTS,
    BUYER_PURCHASE_ACKNOWLEDGEMENTS,
    BUYER_BID_ACKNOWLEDGEMENTS,
  ]) {
    const names = group.map((item) => item.name);
    assert.equal(new Set(names).size, names.length);
    assert.ok(names.length >= 4);
  }
});

test("requireAcknowledgements refuses a missing tick", () => {
  const data = new FormData();
  for (const item of SELLER_ACKNOWLEDGEMENTS.slice(0, -1)) {
    data.set(item.name, "on");
  }

  assert.equal(
    missingAcknowledgements(
      data,
      SELLER_ACKNOWLEDGEMENTS.map((item) => item.name),
    ).length,
    1,
  );
  assert.match(requireAcknowledgements(data, SELLER_ACKNOWLEDGEMENTS) ?? "", /Tick every/);
});
