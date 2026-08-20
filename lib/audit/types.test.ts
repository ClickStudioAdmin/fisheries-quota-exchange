import assert from "node:assert/strict";
import test from "node:test";
import {
  auditActorLabel,
  auditEventCategory,
  auditEventHref,
  auditEventLabel,
  auditEventLinkLabel,
  auditEventSummary,
} from "./types.ts";

test("auditEventLabel covers business and order events", () => {
  assert.equal(auditEventLabel("MEMBER_INVITED"), "Member invited");
  assert.equal(auditEventLabel("TRANSFER_DOCUMENT_GENERATED"), "Transfer application generated");
  assert.equal(auditEventCategory("TRANSFER_APPROVED"), "Orders");
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

test("auditEventSummary names people without emails", () => {
  assert.equal(
    auditEventSummary({
      event_type: "MEMBER_INVITED",
      entity_id: 1,
      payload: { email: "sam@example.com", role: "ADMIN" },
    }),
    "Invited person as Admin",
  );
  assert.equal(
    auditEventSummary(
      {
        event_type: "MEMBER_ROLE_CHANGED",
        entity_id: 1,
        payload: {
          email: "sam@example.com",
          previous_role: "MEMBER",
          role: "ADMIN",
        },
      },
      {
        viewer: "admin",
        personNames: { "sam@example.com": "Sam Fisher" },
      },
    ),
    "Sam Fisher · Member → Admin",
  );
  assert.equal(
    auditEventSummary({
      event_type: "ORDER_CREATED",
      entity_id: 9,
      payload: { buyer_name: "Buyer Co", seller_name: "Seller Co" },
    }),
    "Buyer Co / Seller Co",
  );
  assert.equal(
    auditEventSummary({
      event_type: "USER_VERIFIED",
      entity_id: 0,
      payload: { email: "sam@example.com" },
    }),
    "A user",
  );
});

test("auditActorLabel never returns emails", () => {
  const order = {
    event_type: "COMPLIANCE_APPROVED",
    actor_email: "click.studio.admin@gmail.com",
    payload: { buyer_name: "Buyer Co", seller_name: "Test Buyer" },
    organisation_id: 1,
    related_organisation_id: 2,
    organisation_name: "Buyer Co",
    related_organisation_name: "Test Buyer",
  };
  const business = {
    viewer: "business" as const,
    organisationId: 2,
    organisationName: "Test Buyer",
    personNames: { "pat@example.com": "Pat Buyer" },
  };

  assert.equal(auditActorLabel(order, business), "FQX");
  assert.equal(
    auditActorLabel({ ...order, event_type: "ORDER_CREATED" }, business),
    "Buyer Co",
  );
  assert.equal(
    auditActorLabel(
      { ...order, event_type: "LISTING_CREATED", actor_email: "pat@example.com" },
      business,
    ),
    "Pat Buyer",
  );
  assert.equal(
    auditActorLabel({ ...order, actor_email: null }, business),
    "System",
  );
  assert.equal(auditActorLabel(order, { viewer: "admin" }), "FQX");
  assert.equal(
    auditActorLabel(order, {
      viewer: "admin",
      personNames: { "click.studio.admin@gmail.com": "Click Admin" },
    }),
    "Click Admin",
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
