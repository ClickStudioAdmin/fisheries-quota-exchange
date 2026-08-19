import assert from "node:assert/strict";
import test from "node:test";
import {
  auditEventCategory,
  auditEventHref,
  auditEventLabel,
  auditEventLinkLabel,
  auditEventSummary,
} from "./types.ts";

test("auditEventLabel covers business and order events", () => {
  assert.equal(auditEventLabel("MEMBER_INVITED"), "Member invited");
  assert.equal(auditEventLabel("ORDER_CREATED"), "Order created");
  assert.equal(auditEventLabel("PAYMENTS_SETUP_UPDATED"), "Payments setup updated");
  assert.equal(auditEventLabel("UNKNOWN_EVENT"), "Unknown Event");
});

test("auditEventCategory groups people, listings, orders, and platform", () => {
  assert.equal(auditEventCategory("MEMBER_ADDED"), "People");
  assert.equal(auditEventCategory("HOLDING_CREATED"), "Holdings");
  assert.equal(auditEventCategory("AUCTION_CREATED"), "Listings");
  assert.equal(auditEventCategory("BID_PLACED"), "Listings");
  assert.equal(auditEventCategory("COMPLIANCE_APPROVED"), "Orders");
  assert.equal(auditEventCategory("PAYMENT_RECEIVED"), "Payments");
  assert.equal(auditEventCategory("USER_VERIFIED"), "Platform");
  assert.equal(auditEventCategory("ORGANISATION_CREATED"), "Business");
});

test("auditEventSummary names people and counterparties", () => {
  assert.equal(
    auditEventSummary({
      event_type: "MEMBER_INVITED",
      entity_id: 1,
      payload: { email: "sam@example.com", role: "ADMIN" },
    }),
    "sam@example.com as Admin",
  );
  assert.equal(
    auditEventSummary({
      event_type: "MEMBER_ROLE_CHANGED",
      entity_id: 1,
      payload: {
        email: "sam@example.com",
        previous_role: "MEMBER",
        role: "ADMIN",
      },
    }),
    "sam@example.com · Member → Admin",
  );
  assert.equal(
    auditEventSummary({
      event_type: "ORDER_CREATED",
      entity_id: 9,
      payload: { buyer_name: "Buyer Co", seller_name: "Seller Co" },
    }),
    "Buyer Co / Seller Co",
  );
});

test("auditEventHref follows the entity", () => {
  assert.equal(
    auditEventHref(
      { event_type: "ORDER_CREATED", entity_type: "order", entity_id: 4, payload: {} },
      "business",
    ),
    "/orders/4",
  );
  assert.equal(
    auditEventHref(
      {
        event_type: "AUCTION_CREATED",
        entity_type: "listing",
        entity_id: 8,
        payload: { listing_type: "AUCTION" },
      },
      "business",
    ),
    "/auctions/8",
  );
  assert.equal(
    auditEventHref(
      { event_type: "HOLDING_CREATED", entity_type: "holding", entity_id: 3, payload: {} },
      "admin",
    ),
    "/admin/holdings/3",
  );
  assert.equal(
    auditEventHref(
      {
        event_type: "USER_VERIFIED",
        entity_type: "user",
        entity_id: 0,
        payload: { email: "sam@example.com" },
      },
      "admin",
    ),
    "/admin/users/sam%40example.com",
  );
  assert.equal(
    auditEventLinkLabel({ entity_type: "listing", event_type: "BID_PLACED" }),
    "View auction",
  );
});
