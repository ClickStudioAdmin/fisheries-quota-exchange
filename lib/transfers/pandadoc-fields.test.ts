import assert from "node:assert/strict";
import test from "node:test";
import {
  pandadocCreateFieldsPayload,
  pandadocSigningLayoutsForForm,
} from "./pandadoc-fields.ts";

test("sale layouts target page 3 transferor and transferee row 1", () => {
  const layouts = pandadocSigningLayoutsForForm("FDU1465");
  assert.equal(layouts.length, 8);
  assert.equal(layouts[0]?.page, 3);
  assert.equal(layouts[0]?.fieldId, "sellerSig");
  assert.equal(layouts[0]?.type, "signature");
  assert.ok(layouts[0]!.offsetY > 400);
  assert.ok(layouts.some((item) => item.fieldId === "buyerSig"));
});

test("lease layouts target page 3 first seller and buyer rows", () => {
  const layouts = pandadocSigningLayoutsForForm("FDU1469");
  assert.equal(layouts[0]?.page, 3);
  assert.equal(layouts[0]?.fieldId, "sellerSig");
});

test("create fields payload assigns each layout to a recipient id", () => {
  const payload = pandadocCreateFieldsPayload(
    pandadocSigningLayoutsForForm("FDU1465"),
    { sellerId: "seller-1", buyerId: "buyer-1" },
  );
  assert.equal(payload.fields.length, 8);
  assert.equal(payload.fields[0]?.assigned_to, "seller-1");
  assert.equal(
    payload.fields.find((item) => item.field_id === "buyerSig")?.assigned_to,
    "buyer-1",
  );
  assert.equal(payload.fields[0]?.layout.position.anchor_point, "topleft");
});
