import assert from "node:assert/strict";
import test from "node:test";
import { getTransferProcess } from "./registry.ts";
import { missingTransferProfileFields } from "./profile.ts";
import type { Organisation } from "../organisations/types.ts";

const completeOrg: Organisation = {
  id: 1,
  legal_name: "Seller Pty Ltd",
  trading_name: null,
  abn: "12345678901",
  hide_identity: false,
  notification_roles: ["OWNER", "ADMIN"],
  disabled_notification_emails: [],
  disabled_notification_in_app: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  entity_kind: "COMPANY",
  acn: "123456789",
  phone: "0730000000",
  mobile: null,
  registered_address: "1 Wharf St, Brisbane QLD 4000",
  postal_address: "1 Wharf St, Brisbane QLD 4000",
};

test("getTransferProcess routes QLD sale and lease separately from simulated", () => {
  assert.equal(getTransferProcess("QLD", "SALE").code, "QLD_SALE");
  assert.equal(getTransferProcess("QLD", "SALE").formType, "FDU1465");
  assert.equal(getTransferProcess("QLD", "LEASE").code, "QLD_LEASE");
  assert.equal(getTransferProcess("QLD", "LEASE").usesSimulatedTransfer, false);
  assert.equal(getTransferProcess("NSW", "SALE").code, "SIMULATED");
  assert.equal(getTransferProcess(null, "LEASE").usesSimulatedTransfer, true);
});

test("missingTransferProfileFields is empty for a complete QLD company", () => {
  const process = getTransferProcess("QLD", "SALE");
  assert.deepEqual(
    missingTransferProfileFields({
      organisation: completeOrg,
      profile: {
        organisation_id: 1,
        jurisdiction_id: 4,
        client_reference: "QLD-100",
        licence_number: "L123",
        fishery_symbols: "SM",
      },
      process,
    }),
    [],
  );
});

test("missingTransferProfileFields names QLD gaps and skips ACN for individuals", () => {
  const process = getTransferProcess("QLD", "LEASE");
  const missing = missingTransferProfileFields({
    organisation: {
      ...completeOrg,
      entity_kind: "INDIVIDUAL",
      acn: null,
      abn: null,
      phone: null,
      mobile: null,
      registered_address: null,
    },
    profile: null,
    process,
  });
  assert.equal(missing.includes("acn"), false);
  assert.equal(missing.includes("abn"), false);
  assert.ok(missing.includes("phone_or_mobile"));
  assert.ok(missing.includes("registered_address"));
  assert.ok(missing.includes("qld_client_number"));
  assert.ok(missing.includes("qld_licence_number"));
});

test("simulated process does not require profile fields", () => {
  assert.deepEqual(
    missingTransferProfileFields({
      organisation: { ...completeOrg, entity_kind: null, acn: null },
      profile: null,
      process: getTransferProcess("WA", "SALE"),
    }),
    [],
  );
});
