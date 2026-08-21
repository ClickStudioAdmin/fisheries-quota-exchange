import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pandadocSigningLayoutsForForm } from "./pandadoc-fields.ts";
import { preparePandaDocSigningPdf } from "./pandadoc-pdf.ts";

test("preparePandaDocSigningPdf keeps only signing widgets on declaration boxes", async () => {
  const template = await readFile(
    path.join(process.cwd(), "lib/transfers/forms/fdu1465-v09-23.pdf"),
  );
  const layouts = pandadocSigningLayoutsForForm("FDU1465", {
    sellerRows: 2,
    buyerRows: 1,
  });
  const prepared = await preparePandaDocSigningPdf(template, layouts);
  assert.equal(Object.keys(prepared.fields).length, 12);
  assert.equal(prepared.fields.sellerSig?.role, "Seller");
  assert.equal(prepared.fields.buyerSig?.role, "Buyer");

  const pdf = await PDFDocument.load(prepared.pdf);
  const names = pdf
    .getForm()
    .getFields()
    .map((field) => field.getName())
    .sort();
  assert.deepEqual(names, Object.keys(prepared.fields).sort());

  const sellerSig = pdf.getForm().getSignature("sellerSig");
  const rect = sellerSig.acroField.getWidgets()[0]?.getRectangle();
  assert.equal(rect?.x, 48.5);
  assert.equal(rect?.y, 329);
});
