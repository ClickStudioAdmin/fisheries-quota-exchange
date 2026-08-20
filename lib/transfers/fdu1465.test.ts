import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import type {
  TransferApplicationPdfData,
  TransferPartyDetails,
} from "./application-data.ts";
import {
  fdu1465FieldValues,
  fduAddressParts,
  fduPersonName,
  fduWholeUnits,
  matchFdu1465QuotaRow,
} from "./fdu1465-map.ts";

const address = {
  line1: "1 Wharf St",
  line2: null,
  suburb: "Brisbane",
  state: "QLD" as const,
  postcode: "4000",
};

function party(
  id: number,
  kind: "COMPANY" | "INDIVIDUAL",
  name: string,
): TransferPartyDetails {
  return {
    id,
    legal_name: name,
    trading_name: null,
    abn: "12345678901",
    entity_kind: kind,
    acn: kind === "COMPANY" ? "123456789" : null,
    mobile: "0412345678",
    registered_address: address,
    postal_address: address,
    postal_same_as_registered: true,
    profile: {
      organisation_id: id,
      jurisdiction_id: 1,
      client_reference: `QLD-${id}`,
      licence_number: `L${id}`,
      fishery_symbols: "SM",
    },
    signatories: [{ full_name: name, role: "OWNER" }],
  };
}

function pdfData(
  overrides: Partial<TransferApplicationPdfData> = {},
): TransferApplicationPdfData {
  return {
    orderId: 3634,
    formType: "FDU1465",
    formVersion: "V09/23",
    title: "Permanent transfer of quota and/or effort units (FDU1465)",
    offeringLabel: "Sale",
    fisheryName: "East Coast Spanish Mackerel Fishery",
    quotaTypeName: "Quota",
    quantity: "5000.00",
    unitLabel: "kg",
    seller: party(1, "COMPANY", "Test Org"),
    buyer: party(2, "COMPANY", "Test Buyer Pty Ltd"),
    ...overrides,
  };
}

test("fduWholeUnits stores whole numbers without decimals", () => {
  assert.equal(fduWholeUnits("5000.00"), "5000");
  assert.equal(fduWholeUnits("12.5"), "12.5");
});

test("fduPersonName splits a personal legal name", () => {
  assert.deepEqual(fduPersonName("Jane Citizen"), {
    surname: "Citizen",
    given: "Jane",
  });
});

test("fduAddressParts keep postcode separate", () => {
  assert.deepEqual(fduAddressParts(address), {
    text: "1 Wharf St, Brisbane, QLD",
    postcode: "4000",
  });
});

test("matchFdu1465QuotaRow maps Spanish mackerel to SM units", () => {
  const row = matchFdu1465QuotaRow(
    "QLD - East Coast Spanish Mackerel Fishery Quota kg",
  );
  assert.equal(row?.unused, "ECIFF-24");
  assert.equal(row?.used, "ECIFF-25");
});

test("fdu1465FieldValues fills company transferor and transferee plus SM units", () => {
  const values = fdu1465FieldValues(pdfData());
  assert.equal(values["Textfield-2"], "Test Org");
  assert.equal(values["Textfield-3"], undefined);
  assert.equal(values["Text10"], "1 Wharf St, Brisbane, QLD");
  assert.equal(values["Text12"], "4000");
  assert.equal(values["Textfield-7"], "0412345678");
  assert.equal(values["Textfield-9"], "QLD-1");
  assert.equal(values["Textfield-19"], "Test Buyer Pty Ltd");
  assert.equal(values["Textfield-10"], undefined);
  assert.equal(values["Text6"], "1 Wharf St, Brisbane, QLD");
  assert.equal(values["Textfield-23"], "0412345678");
  assert.equal(values["Textfield-25"], "QLD-2");
  assert.equal(values["ECIFF-24"], "5000");
  assert.equal(values["ECIFF-25"], undefined);
  assert.equal(values["Textfield-0"], undefined);
});

test("fdu1465FieldValues uses section 1 for an individual transferee", () => {
  const values = fdu1465FieldValues(
    pdfData({ buyer: party(2, "INDIVIDUAL", "Jane Citizen") }),
  );
  assert.equal(values["Textfield-19"], undefined);
  assert.equal(values["Textfield-10"], "Citizen");
  assert.equal(values["Textfield-11"], "Jane");
});

test("official FDU1465 template accepts mapped field names", async () => {
  const bytes = readFileSync(new URL("./forms/fdu1465-v09-23.pdf", import.meta.url));
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const values = fdu1465FieldValues(pdfData());

  for (const [name, value] of Object.entries(values)) {
    form.getTextField(name).setText(value);
  }

  const filled = await PDFDocument.load(await pdf.save());
  assert.equal(filled.getPageCount(), 4);
  assert.equal(filled.getForm().getTextField("Textfield-2").getText(), "Test Org");
  assert.equal(
    filled.getForm().getTextField("Textfield-19").getText(),
    "Test Buyer Pty Ltd",
  );
  assert.equal(filled.getForm().getTextField("ECIFF-24").getText(), "5000");
  assert.equal(filled.getForm().getTextField("Textfield-9").getText(), "QLD-1");
});
