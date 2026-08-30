import assert from "node:assert/strict";
import test from "node:test";
import {
  pandadocCreateFieldsPayload,
  pandadocDeclarationRowCount,
  pandadocSigningLayoutsForForm,
} from "./pandadoc-fields.ts";

test("declaration row count clamps to 1–3", () => {
  assert.equal(pandadocDeclarationRowCount(0), 1);
  assert.equal(pandadocDeclarationRowCount(1), 1);
  assert.equal(pandadocDeclarationRowCount(2), 2);
  assert.equal(pandadocDeclarationRowCount(3), 3);
  assert.equal(pandadocDeclarationRowCount(9), 3);
});

test("sale layouts default to one transferor and one transferee row", () => {
  const layouts = pandadocSigningLayoutsForForm("FDU1465");
  assert.equal(layouts.length, 8);
  assert.equal(layouts[0]?.page, 3);
  assert.equal(layouts[0]?.fieldId, "sellerSig");
  assert.equal(layouts[0]?.type, "signature");
  assert.equal(layouts[0]?.offsetX, 48.5);
  assert.equal(layouts[0]?.offsetY, 329);
  assert.ok(layouts.some((item) => item.fieldId === "buyerSig"));
  assert.equal(
    layouts.some((item) => item.fieldId === "sellerSig2"),
    false,
  );
});

test("sale layouts place up to three rows per side from signatory counts", () => {
  const layouts = pandadocSigningLayoutsForForm("FDU1465", {
    sellerRows: 3,
    buyerRows: 2,
  });
  assert.equal(layouts.length, 20);
  assert.equal(
    layouts.filter((item) => item.role === "Seller").length,
    12,
  );
  assert.equal(
    layouts.filter((item) => item.role === "Buyer").length,
    8,
  );
  assert.ok(layouts.some((item) => item.fieldId === "sellerSig3"));
  assert.equal(
    layouts.find((item) => item.fieldId === "sellerSig3")?.offsetY,
    266.6,
  );
  assert.ok(layouts.some((item) => item.fieldId === "buyerSig2"));
  assert.equal(
    layouts.find((item) => item.fieldId === "buyerSig2")?.offsetY,
    123.6,
  );
});

test("lease layouts target page 3 first seller and buyer rows", () => {
  const layouts = pandadocSigningLayoutsForForm("FDU1469");
  assert.equal(layouts[0]?.page, 3);
  assert.equal(layouts[0]?.fieldId, "sellerSig");
  assert.equal(layouts[0]?.offsetY, 400.87);
});

test("lease layouts cap buyer rows at two form blocks", () => {
  const layouts = pandadocSigningLayoutsForForm("FDU1469", {
    sellerRows: 3,
    buyerRows: 3,
  });
  assert.equal(
    layouts.filter((item) => item.role === "Seller").length,
    12,
  );
  assert.equal(
    layouts.filter((item) => item.role === "Buyer").length,
    8,
  );
  assert.ok(layouts.some((item) => item.fieldId === "buyerSig2"));
  assert.equal(
    layouts.some((item) => item.fieldId === "buyerSig3"),
    false,
  );
});

test("create fields payload assigns each layout to a recipient id", () => {
  const payload = pandadocCreateFieldsPayload(
    pandadocSigningLayoutsForForm("FDU1465", {
      sellerRows: 2,
      buyerRows: 1,
    }),
    { sellerId: "seller-1", buyerId: "buyer-1" },
  );
  assert.equal(payload.fields.length, 12);
  assert.equal(payload.fields[0]?.assigned_to, "seller-1");
  assert.equal(
    payload.fields.find((item) => item.field_id === "buyerSig")?.assigned_to,
    "buyer-1",
  );
  assert.equal(
    payload.fields.find((item) => item.field_id === "sellerSig2")?.assigned_to,
    "seller-1",
  );
  assert.equal(payload.fields[0]?.layout.position.anchor_point, "bottomleft");
  assert.equal(payload.fields[0]?.layout.position.offset_y, 329);
  assert.equal(
    Number.isInteger(payload.fields[0]?.layout.style.width),
    true,
  );
  assert.equal(
    Number.isInteger(payload.fields[0]?.layout.style.height),
    true,
  );
});
