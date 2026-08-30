import assert from "node:assert/strict";
import test from "node:test";
import {
  latestComplianceUpdateNotes,
  selectedComplianceUpdateNotes,
} from "./compliance-update.ts";

test("selectedComplianceUpdateNotes requires a ticked party and a message", () => {
  assert.deepEqual(
    selectedComplianceUpdateNotes({
      notifyBuyer: false,
      buyerNote: "Fix ABN",
      notifySeller: false,
      sellerNote: "Fix licence",
    }),
    { error: "Tick at least one party to notify." },
  );
  assert.deepEqual(
    selectedComplianceUpdateNotes({
      notifyBuyer: true,
      buyerNote: "  ",
      notifySeller: false,
      sellerNote: "",
    }),
    { error: "Add a message for the buyer." },
  );
  assert.deepEqual(
    selectedComplianceUpdateNotes({
      notifyBuyer: false,
      buyerNote: "ignored",
      notifySeller: true,
      sellerNote: "Update the licence number.",
    }),
    { buyerNote: null, sellerNote: "Update the licence number." },
  );
  assert.deepEqual(
    selectedComplianceUpdateNotes({
      notifyBuyer: true,
      buyerNote: " Fix ABN. ",
      notifySeller: true,
      sellerNote: "Fix licence.",
    }),
    { buyerNote: "Fix ABN.", sellerNote: "Fix licence." },
  );
});

test("latestComplianceUpdateNotes keeps the newest note per party", () => {
  assert.deepEqual(
    latestComplianceUpdateNotes([
      {
        event_type: "COMPLIANCE_UPDATE_REQUESTED_BUYER",
        payload: { note: "Latest buyer" },
      },
      {
        event_type: "COMPLIANCE_UPDATE_REQUESTED_SELLER",
        payload: { note: "Seller note" },
      },
      {
        event_type: "COMPLIANCE_UPDATE_REQUESTED_BUYER",
        payload: { note: "Older buyer" },
      },
      {
        event_type: "COMPLIANCE_REJECTED",
        payload: { note: "Ignore" },
      },
    ]),
    { buyer: "Latest buyer", seller: "Seller note" },
  );
  assert.deepEqual(latestComplianceUpdateNotes([]), {
    buyer: null,
    seller: null,
  });
});
