import assert from "node:assert/strict";
import test from "node:test";
import {
  australianAddressIsComplete,
  formatAustralianAddress,
  parseAustralianAddress,
  readAustralianAddress,
} from "./address.ts";

const complete = {
  line1: "1 Wharf St",
  line2: null,
  suburb: "Brisbane",
  state: "QLD" as const,
  postcode: "4000",
};

test("australianAddressIsComplete requires street, suburb, state, and postcode", () => {
  assert.equal(australianAddressIsComplete(complete), true);
  assert.equal(
    australianAddressIsComplete({ ...complete, postcode: "400" }),
    false,
  );
  assert.equal(australianAddressIsComplete({ ...complete, suburb: "" }), false);
  assert.equal(australianAddressIsComplete(null), false);
});

test("formatAustralianAddress joins street and locality", () => {
  assert.equal(
    formatAustralianAddress(complete),
    "1 Wharf St, Brisbane QLD 4000",
  );
  assert.equal(
    formatAustralianAddress({ ...complete, line2: "Level 2" }),
    "1 Wharf St, Level 2, Brisbane QLD 4000",
  );
});

test("parseAustralianAddress rejects unknown states and empty objects", () => {
  assert.deepEqual(parseAustralianAddress(complete), complete);
  assert.equal(parseAustralianAddress({ ...complete, state: "ZZ" }), null);
  assert.equal(parseAustralianAddress({}), null);
});

test("readAustralianAddress validates form prefixes", () => {
  const form = new FormData();
  form.set("registered_line1", "1 Wharf St");
  form.set("registered_suburb", "Brisbane");
  form.set("registered_state", "qld");
  form.set("registered_postcode", "4000");
  const parsed = readAustralianAddress(form, "registered");
  assert.deepEqual("address" in parsed ? parsed.address : null, complete);

  const empty = readAustralianAddress(new FormData(), "registered");
  assert.equal("address" in empty ? empty.address : "missing", null);

  const bad = new FormData();
  bad.set("postal_line1", "PO Box 1");
  bad.set("postal_suburb", "Brisbane");
  bad.set("postal_state", "QLD");
  bad.set("postal_postcode", "40");
  const invalid = readAustralianAddress(bad, "postal");
  assert.equal("error" in invalid, true);
});
