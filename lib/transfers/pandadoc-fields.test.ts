import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  addPandadocSigningFields,
  pandadocSigningTagsForForm,
} from "./pandadoc-fields.ts";

test("PandaDoc tags target the first transferor and transferee rows", () => {
  const sale = pandadocSigningTagsForForm("FDU1465");
  assert.equal(sale[0]?.page, 2);
  assert.match(sale[0]?.tag ?? "", /sellerSig/);
  assert.ok(sale.some((item) => item.tag.includes("buyerSig")));
  assert.equal(pandadocSigningTagsForForm("FDU1469")[0]?.page, 3);
});

test("tagging FDU1465 does not add an extra page", async () => {
  const template = await readFile(
    path.join(process.cwd(), "lib/transfers/forms/fdu1465-v09-23.pdf"),
  );
  const tagged = await addPandadocSigningFields(Buffer.from(template), "FDU1465");
  const pdf = await PDFDocument.load(tagged);
  assert.equal(pdf.getPageCount(), 4);
});
