import assert from "node:assert/strict";
import test from "node:test";
import {
  currentTransferDocuments,
  nextTransferDocumentVersion,
  transferStoredFilename,
  transferStoredFilenameForType,
} from "./filenames.ts";

test("transferStoredFilename includes order, form, kind, and version", () => {
  assert.equal(
    transferStoredFilename({
      orderId: 3634,
      kind: "seller-signed",
      formType: "FDU1465",
      formVersion: "V09/23",
      version: 2,
    }),
    "FQX-order-3634-FDU1465-V0923-seller-signed-v2.pdf",
  );
  assert.equal(
    transferStoredFilenameForType({
      orderId: 12,
      type: "SIGNED_PACK",
      formType: "FDU1469",
      formVersion: "V02/26",
      version: 1,
    }),
    "FQX-order-12-FDU1469-V0226-completed-pack-v1.pdf",
  );
});

test("nextTransferDocumentVersion counts existing files of that type", () => {
  const documents = [
    { document_type: "UNSIGNED_APPLICATION" },
    { document_type: "SELLER_SIGNED" },
    { document_type: "UNSIGNED_APPLICATION" },
  ];
  assert.equal(nextTransferDocumentVersion(documents, "UNSIGNED_APPLICATION"), 3);
  assert.equal(nextTransferDocumentVersion(documents, "SELLER_SIGNED"), 2);
  assert.equal(nextTransferDocumentVersion(documents, "SIGNED_PACK"), 1);
});

test("currentTransferDocuments hides signed files from an earlier application", () => {
  const documents = [
    {
      document_type: "UNSIGNED_APPLICATION",
      created_at: "2026-08-20T06:00:00.000Z",
      id: 3,
    },
    {
      document_type: "SIGNED_PACK",
      created_at: "2026-08-20T05:00:00.000Z",
      id: 2,
    },
    {
      document_type: "SELLER_SIGNED",
      created_at: "2026-08-20T04:00:00.000Z",
      id: 1,
    },
    {
      document_type: "UNSIGNED_APPLICATION",
      created_at: "2026-08-20T03:00:00.000Z",
      id: 0,
    },
  ];

  const current = currentTransferDocuments(documents);
  assert.equal(current.latestUnsigned?.id, 3);
  assert.equal(current.latestSellerSigned, null);
  assert.equal(current.latestSignedPack, null);
});

test("currentTransferDocuments keeps signed files uploaded after the latest unsigned PDF", () => {
  const documents = [
    {
      document_type: "SELLER_SIGNED",
      created_at: "2026-08-20T06:30:00.000Z",
      id: 4,
    },
    {
      document_type: "UNSIGNED_APPLICATION",
      created_at: "2026-08-20T06:00:00.000Z",
      id: 3,
    },
    {
      document_type: "SELLER_SIGNED",
      created_at: "2026-08-20T04:00:00.000Z",
      id: 1,
    },
  ];

  const current = currentTransferDocuments(documents);
  assert.equal(current.latestUnsigned?.id, 3);
  assert.equal(current.latestSellerSigned?.id, 4);
  assert.equal(current.latestSignedPack, null);
});
