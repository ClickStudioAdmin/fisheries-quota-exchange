import assert from "node:assert/strict";
import test from "node:test";
import type { Organisation } from "./types.ts";
import {
  formatMissingTradeReadyMessage,
  missingBusinessDetailFields,
  missingQldTradeFields,
  missingTradeReadyFields,
  tradeRequiresQldProfile,
} from "./completeness.ts";

const completeAddress = {
  line1: "1 Wharf St",
  line2: null,
  suburb: "Brisbane",
  state: "QLD" as const,
  postcode: "4000",
};

const completeCompany: Organisation = {
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
  mobile: "0412345678",
  registered_address: completeAddress,
  postal_address: completeAddress,
  postal_same_as_registered: true,
  enabled_jurisdiction_codes: [],
};

test("tradeRequiresQldProfile is only true for QLD", () => {
  assert.equal(tradeRequiresQldProfile("QLD"), true);
  assert.equal(tradeRequiresQldProfile("CTH"), false);
  assert.equal(tradeRequiresQldProfile(null), false);
});

test("missingBusinessDetailFields is empty for a complete company", () => {
  assert.deepEqual(missingBusinessDetailFields(completeCompany), []);
});

test("missingBusinessDetailFields requires ABN for individuals and skips ACN", () => {
  assert.deepEqual(
    missingBusinessDetailFields({
      ...completeCompany,
      entity_kind: "INDIVIDUAL",
      acn: null,
    }),
    [],
  );
  assert.deepEqual(
    missingBusinessDetailFields({
      ...completeCompany,
      entity_kind: "INDIVIDUAL",
      acn: null,
      abn: null,
    }),
    ["abn"],
  );
});

test("missingBusinessDetailFields names identity, phone, and address gaps", () => {
  assert.deepEqual(
    missingBusinessDetailFields({
      ...completeCompany,
      entity_kind: null,
      legal_name: " ",
      abn: null,
      acn: null,
      mobile: null,
      registered_address: { ...completeAddress, postcode: "400" },
    }),
    [
      "entity_kind",
      "legal_name",
      "abn",
      "mobile",
      "registered_address",
    ],
  );
});

test("missingBusinessDetailFields requires postal address only when it differs", () => {
  assert.deepEqual(
    missingBusinessDetailFields({
      ...completeCompany,
      postal_same_as_registered: false,
      postal_address: null,
    }),
    ["postal_address"],
  );
  assert.deepEqual(
    missingBusinessDetailFields({
      ...completeCompany,
      postal_same_as_registered: true,
      postal_address: null,
    }),
    [],
  );
});

test("missingQldTradeFields requires client number and licence, not symbols", () => {
  assert.deepEqual(missingQldTradeFields(null), [
    "qld_client_number",
    "qld_licence_number",
  ]);
  assert.deepEqual(
    missingQldTradeFields({
      client_reference: "QLD-100",
      licence_number: "L123",
    }),
    [],
  );
});

test("missingTradeReadyFields adds QLD fields only when required", () => {
  assert.deepEqual(
    missingTradeReadyFields({
      organisation: completeCompany,
      qldProfile: null,
      requireQldProfile: false,
    }),
    [],
  );
  assert.deepEqual(
    missingTradeReadyFields({
      organisation: completeCompany,
      qldProfile: null,
      requireQldProfile: true,
    }),
    ["qld_client_number", "qld_licence_number"],
  );
  assert.deepEqual(
    missingTradeReadyFields({
      organisation: {
        ...completeCompany,
        enabled_jurisdiction_codes: ["QLD"],
      },
      qldProfile: {
        client_reference: "QLD-100",
        licence_number: "L123",
      },
      requireQldProfile: true,
    }),
    [],
  );
  assert.deepEqual(
    missingTradeReadyFields({
      organisation: completeCompany,
      qldProfile: {
        client_reference: "QLD-100",
        licence_number: "L123",
      },
      requireQldProfile: true,
    }),
    ["qld_client_number", "qld_licence_number"],
  );
});

test("formatMissingTradeReadyMessage lists labels", () => {
  assert.match(
    formatMissingTradeReadyMessage(["abn", "qld_licence_number"]),
    /Missing: ABN, Primary commercial fishing licence\./,
  );
});
