export const AUDIT_CATEGORIES = [
  "People",
  "Business",
  "Holdings",
  "Listings",
  "Orders",
  "Payments",
  "Platform",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export type AuditEvent = {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: number;
  actor_email: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  organisation_id: number | null;
  related_organisation_id: number | null;
  organisation_name?: string | null;
  related_organisation_name?: string | null;
};

export type AuditLogViewer = "business" | "admin";

export type AuditActorContext = {
  viewer: AuditLogViewer;
  organisationId?: number | null;
  organisationName?: string | null;
  personNames?: Record<string, string>;
};

const PLATFORM_ACTOR_EVENTS = new Set([
  "COMPLIANCE_APPROVED",
  "COMPLIANCE_REJECTED",
  "TRANSFER_SIMULATED",
  "TRANSFER_DOCUMENT_GENERATED",
  "TRANSFER_SIGNED_PACK_UPLOADED",
  "TRANSFER_SUBMITTED",
  "TRANSFER_PROCESSING",
  "TRANSFER_ACTION_REQUIRED",
  "TRANSFER_APPROVED",
  "SETTLEMENT_SIMULATED",
  "LISTING_REJECTED",
  "AUCTION_REJECTED",
  "HOLDING_UNVERIFIED",
  "USER_VERIFIED",
  "USER_UNVERIFIED",
  "PLATFORM_SETTINGS_UPDATED",
]);

function titleCaseEvent(eventType: string) {
  return eventType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function payloadString(payload: Record<string, unknown> | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

function payloadRole(payload: Record<string, unknown>, key = "role") {
  const value = payloadString(payload, key);
  if (value === "OWNER") return "Owner";
  if (value === "ADMIN") return "Admin";
  if (value === "MEMBER") return "Member";
  return value;
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}

function personName(email: string, names?: Record<string, string>) {
  if (!email) {
    return "";
  }

  const name = names?.[email.toLowerCase()]?.trim() ?? "";
  return looksLikeEmail(name) ? "" : name;
}

function safeLabel(...values: Array<string | null | undefined>) {
  return (
    values.find((value) => {
      const text = value?.trim() ?? "";
      return text.length > 0 && !looksLikeEmail(text);
    })?.trim() ?? ""
  );
}

function otherPartyName(
  event: Pick<
    AuditEvent,
    | "payload"
    | "organisation_id"
    | "related_organisation_id"
    | "organisation_name"
    | "related_organisation_name"
  >,
  context: AuditActorContext,
) {
  const thisId = context.organisationId ?? null;
  const thisName = (context.organisationName ?? "").trim();
  const buyer = payloadString(event.payload, "buyer_name");
  const seller = payloadString(event.payload, "seller_name");
  const organisationName = event.organisation_name?.trim() ?? "";
  const relatedName = event.related_organisation_name?.trim() ?? "";

  const pick = (...values: string[]) =>
    values.find(
      (value) => value && value !== thisName && !looksLikeEmail(value),
    ) ?? "";

  if (thisId != null && event.organisation_id === thisId) {
    return pick(relatedName, seller, buyer);
  }

  if (thisId != null && event.related_organisation_id === thisId) {
    return pick(organisationName, buyer, seller);
  }

  return pick(relatedName, organisationName, buyer, seller);
}

export function auditActorLabel(
  event: Pick<
    AuditEvent,
    | "event_type"
    | "actor_email"
    | "payload"
    | "organisation_id"
    | "related_organisation_id"
    | "organisation_name"
    | "related_organisation_name"
  >,
  context: AuditActorContext,
) {
  const email = event.actor_email?.trim().toLowerCase() ?? "";

  if (!email) {
    return "System";
  }

  const name = personName(email, context.personNames);
  const knownPerson = Object.prototype.hasOwnProperty.call(
    context.personNames ?? {},
    email,
  );

  if (context.viewer === "admin") {
    if (name) {
      return name;
    }

    if (PLATFORM_ACTOR_EVENTS.has(event.event_type)) {
      return "FQX";
    }

    return safeLabel(otherPartyName(event, context), "Someone");
  }

  if (PLATFORM_ACTOR_EVENTS.has(event.event_type)) {
    return "FQX";
  }

  if (knownPerson) {
    return safeLabel(name, "Member");
  }

  if (
    event.event_type === "HOLDING_VERIFIED" ||
    event.event_type === "HOLDING_CHECK_COMPLETED" ||
    event.event_type === "LISTING_PUBLISHED" ||
    event.event_type === "LISTING_CHECK_COMPLETED" ||
    event.event_type === "AUCTION_PUBLISHED" ||
    event.event_type === "COMPLIANCE_CHECK_COMPLETED"
  ) {
    return "FQX";
  }

  return safeLabel(otherPartyName(event, context), "Another business");
}

export function auditEventLabel(eventType: string) {
  switch (eventType) {
    case "ORGANISATION_CREATED":
      return "Business created";
    case "ORGANISATION_DETAILS_UPDATED":
      return "Business details updated";
    case "NOTIFICATION_ROLES_UPDATED":
      return "Notification roles updated";
    case "NOTIFICATION_PREFERENCES_UPDATED":
      return "Notification preferences updated";
    case "PAYMENTS_SETUP_UPDATED":
      return "Payments setup updated";
    case "MEMBER_INVITED":
      return "Member invited";
    case "MEMBER_ADDED":
      return "Member joined";
    case "MEMBER_ROLE_CHANGED":
      return "Member role changed";
    case "MEMBER_REMOVED":
      return "Member removed";
    case "MEMBER_LEFT":
      return "Member left";
    case "INVITATION_CANCELLED":
      return "Invitation cancelled";
    case "INVITATION_DECLINED":
      return "Invitation declined";
    case "HOLDING_CREATED":
      return "Holding created";
    case "HOLDING_ADJUSTED":
      return "Holding adjusted";
    case "HOLDING_VERIFIED":
      return "Holding verified";
    case "HOLDING_CHECK_COMPLETED":
      return "Verification check completed";
    case "HOLDING_UNVERIFIED":
      return "Holding unverified";
    case "LISTING_CREATED":
      return "Listing created";
    case "LISTING_UPDATED":
      return "Listing updated";
    case "LISTING_CHECK_COMPLETED":
      return "Listing check completed";
    case "LISTING_PUBLISHED":
      return "Listing published";
    case "LISTING_CANCELLED":
      return "Listing cancelled";
    case "LISTING_REJECTED":
      return "Listing rejected";
    case "AUCTION_CREATED":
      return "Auction created";
    case "AUCTION_PUBLISHED":
      return "Auction published";
    case "AUCTION_CANCELLED":
      return "Auction cancelled";
    case "AUCTION_REJECTED":
      return "Auction rejected";
    case "ORDER_CREATED":
      return "Order created";
    case "QUOTA_RESERVED":
      return "Quota reserved";
    case "ORDER_CANCELLED":
      return "Order cancelled";
    case "PAYMENT_RECEIVED":
      return "Payment received";
    case "PAYMENT_FAILED":
      return "Payment failed";
    case "COMPLIANCE_CHECK_COMPLETED":
      return "Compliance check completed";
    case "COMPLIANCE_APPROVED":
      return "Compliance approved";
    case "COMPLIANCE_REJECTED":
      return "Compliance rejected";
    case "TRANSFER_SIMULATED":
      return "Transfer recorded";
    case "TRANSFER_DOCUMENT_GENERATED":
      return "Transfer application generated";
    case "TRANSFER_SIGNED_PACK_UPLOADED":
      return "Signed transfer pack uploaded";
    case "TRANSFER_SUBMITTED":
      return "Transfer submitted to Fisheries Queensland";
    case "TRANSFER_PROCESSING":
      return "Fisheries Queensland processing";
    case "TRANSFER_ACTION_REQUIRED":
      return "Transfer action required";
    case "TRANSFER_APPROVED":
      return "Fisheries Queensland approved";
    case "SETTLEMENT_SIMULATED":
      return "Settlement completed";
    case "BID_PLACED":
      return "Bid placed";
    case "AUCTION_CLOSED":
      return "Auction closed";
    case "AUCTION_UNSOLD":
      return "Auction unsold";
    case "USER_VERIFIED":
      return "User verified";
    case "USER_UNVERIFIED":
      return "User unverified";
    case "PLATFORM_SETTINGS_UPDATED":
      return "Platform settings updated";
    default:
      return titleCaseEvent(eventType);
  }
}

export function auditEventCategory(eventType: string): AuditCategory {
  if (
    eventType.startsWith("MEMBER_") ||
    eventType.startsWith("INVITATION_")
  ) {
    return "People";
  }

  if (eventType.startsWith("HOLDING_")) {
    return "Holdings";
  }

  if (
    eventType.startsWith("LISTING_") ||
    eventType.startsWith("AUCTION_") ||
    eventType === "BID_PLACED"
  ) {
    return "Listings";
  }

  if (
    eventType.startsWith("ORDER_") ||
    eventType === "QUOTA_RESERVED" ||
    eventType.startsWith("COMPLIANCE_") ||
    eventType === "TRANSFER_SIMULATED" ||
    eventType.startsWith("TRANSFER_") ||
    eventType === "SETTLEMENT_SIMULATED"
  ) {
    return "Orders";
  }

  if (
    eventType === "PAYMENT_RECEIVED" ||
    eventType === "PAYMENT_FAILED" ||
    eventType === "PAYMENTS_SETUP_UPDATED"
  ) {
    return "Payments";
  }

  if (
    eventType === "USER_VERIFIED" ||
    eventType === "USER_UNVERIFIED" ||
    eventType === "PLATFORM_SETTINGS_UPDATED"
  ) {
    return "Platform";
  }

  return "Business";
}

export function auditEventSummary(
  event: Pick<AuditEvent, "event_type" | "payload" | "entity_id">,
  context: AuditActorContext = { viewer: "business" },
) {
  const payload = event.payload ?? {};
  const subjectEmail = payloadString(payload, "email").toLowerCase();
  const subjectName = personName(subjectEmail, context.personNames);
  const knownSubject = Object.prototype.hasOwnProperty.call(
    context.personNames ?? {},
    subjectEmail,
  );
  const subject =
    subjectName ||
    (knownSubject ? "Member" : "") ||
    (subjectEmail
      ? context.viewer === "admin"
        ? "Someone"
        : event.event_type.startsWith("INVITATION_") ||
            event.event_type === "MEMBER_INVITED"
          ? "Invited person"
          : "Someone"
      : "");
  const fishery = payloadString(payload, "fishery_name");
  const role = payloadRole(payload);
  const legalName = payloadString(payload, "legal_name");
  const buyer = payloadString(payload, "buyer_name");
  const seller = payloadString(payload, "seller_name");

  if (event.event_type === "MEMBER_ROLE_CHANGED") {
    const previous = payloadRole(payload, "previous_role");
    return safeLabel(
      [subject, previous && role ? `${previous} → ${role}` : role]
        .filter(Boolean)
        .join(" · "),
    );
  }

  if (event.event_type.startsWith("MEMBER_") || event.event_type.startsWith("INVITATION_")) {
    return safeLabel([subject, role].filter(Boolean).join(" as "));
  }

  if (event.event_type === "USER_VERIFIED" || event.event_type === "USER_UNVERIFIED") {
    return safeLabel(subjectName, "A user");
  }

  if (event.event_type === "PAYMENTS_SETUP_UPDATED") {
    return payload.charges_enabled === true
      ? "Charges enabled"
      : "Charges not enabled";
  }

  if (
    event.event_type === "HOLDING_CHECK_COMPLETED" ||
    event.event_type === "LISTING_CHECK_COMPLETED" ||
    event.event_type === "COMPLIANCE_CHECK_COMPLETED"
  ) {
    return safeLabel(payloadString(payload, "check")) || "—";
  }

  if (buyer || seller) {
    return safeLabel(
      [fishery, buyer && seller ? `${buyer} / ${seller}` : buyer || seller]
        .filter(Boolean)
        .join(" · "),
    );
  }

  if (event.event_type.startsWith("ORDER_") || event.event_type === "QUOTA_RESERVED"
    || event.event_type === "PAYMENT_RECEIVED" || event.event_type === "PAYMENT_FAILED"
    || event.event_type.startsWith("COMPLIANCE_")
    || event.event_type === "TRANSFER_SIMULATED"
    || event.event_type.startsWith("TRANSFER_")
    || event.event_type === "SETTLEMENT_SIMULATED") {
    return safeLabel(
      [`Order ${event.entity_id}`, fishery].filter(Boolean).join(" · "),
    );
  }

  return safeLabel(legalName, fishery) || "—";
}

export function auditEventHref(
  event: Pick<AuditEvent, "event_type" | "entity_type" | "entity_id" | "payload">,
  viewer: AuditLogViewer,
) {
  const payload = event.payload ?? {};
  const listingType = payloadString(payload, "listing_type");
  const email = payloadString(payload, "email");

  if (event.entity_type === "order") {
    return `/orders/${event.entity_id}`;
  }

  if (event.entity_type === "listing") {
    return listingType === "AUCTION" || event.event_type.startsWith("AUCTION_")
      || event.event_type === "BID_PLACED"
      ? `/auctions/${event.entity_id}`
      : `/marketplace/${event.entity_id}`;
  }

  if (event.entity_type === "holding") {
    return viewer === "admin"
      ? `/admin/holdings/${event.entity_id}`
      : `/dashboard/holdings/${event.entity_id}`;
  }

  if (event.entity_type === "organisation" && event.event_type === "PAYMENTS_SETUP_UPDATED") {
    return viewer === "admin" ? "/admin" : "/dashboard/account?tab=payments";
  }

  if (event.entity_type === "organisation" || event.entity_type === "member"
    || event.entity_type === "invitation") {
    return viewer === "admin" ? "/admin/users" : "/dashboard/account?tab=members";
  }

  if (event.entity_type === "user" && email) {
    return `/admin/users/${encodeURIComponent(email.trim().toLowerCase())}`;
  }

  if (event.entity_type === "settings") {
    return "/admin/settings";
  }

  return null;
}

export function auditEventLinkLabel(
  event: Pick<AuditEvent, "entity_type" | "event_type">,
) {
  if (event.entity_type === "order") {
    return "View order";
  }

  if (event.entity_type === "listing") {
    return event.event_type.startsWith("AUCTION_") || event.event_type === "BID_PLACED"
      ? "View auction"
      : "View listing";
  }

  if (event.entity_type === "holding") {
    return "View holding";
  }

  if (event.entity_type === "user") {
    return "View user";
  }

  if (event.entity_type === "settings") {
    return "Platform settings";
  }

  if (event.event_type === "PAYMENTS_SETUP_UPDATED") {
    return "Payments";
  }

  if (
    event.entity_type === "member" ||
    event.entity_type === "invitation" ||
    event.entity_type === "organisation"
  ) {
    return "Business Settings";
  }

  return "View";
}

export function auditCategoryOptions() {
  return AUDIT_CATEGORIES.map((value) => ({ value, label: value }));
}
