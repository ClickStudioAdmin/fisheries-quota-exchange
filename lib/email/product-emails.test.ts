import assert from "node:assert/strict";
import test from "node:test";
import {
  MEMBER_EMAIL_IDS,
  PRODUCT_EMAIL_IDS,
  accountNotificationEmailIds,
  disabledProductEmails,
  emailIsDisabled,
  groupedNotificationIds,
  isAccountNotificationEmailId,
  notificationAudienceLabel,
  notificationAudiences,
  parseDisabledProductEmails,
  personalNotificationEmailIds,
  PROFILE_NOTIFICATION_GROUPS,
  profileNotificationEmailIds,
} from "./product-emails.ts";
import { emailCopy } from "./copy.ts";

test("emailIsDisabled matches saved platform settings", () => {
  assert.equal(emailIsDisabled(["bid_placed"], "bid_placed"), true);
  assert.equal(emailIsDisabled(["bid_placed"], "listing_published"), false);
  assert.equal(emailIsDisabled([], "order_settled"), false);
});

test("disabledProductEmails is the unchecked remainder", () => {
  const disabled = disabledProductEmails(["member_added", "order_settled"]);
  assert.equal(disabled.includes("member_added"), false);
  assert.equal(disabled.includes("order_settled"), false);
  assert.equal(disabled.includes("listing_published"), true);
  assert.equal(disabled.length, PRODUCT_EMAIL_IDS.length - 2);
});

test("personalNotificationEmailIds omits mail the person would not receive", () => {
  const none = personalNotificationEmailIds({
    isOrgMember: false,
    isOrgManager: false,
  });
  assert.equal(none.includes("member_added"), true);
  assert.equal(none.includes("listing_alert"), true);
  assert.equal(none.includes("listing_purchased"), false);
  assert.equal(none.includes("purchase_received"), false);
  assert.equal(none.includes("operator_holding_pending"), false);

  const member = personalNotificationEmailIds({
    isOrgMember: true,
    isOrgManager: false,
  });
  assert.equal(member.includes("purchase_received"), true);
  assert.equal(member.includes("bid_placed"), true);
  assert.equal(member.includes("listing_purchased"), false);
  assert.equal(member.includes("holding_verified"), false);
  assert.equal(member.includes("operator_order_pending"), false);

  const manager = personalNotificationEmailIds({
    isOrgMember: true,
    isOrgManager: true,
  });
  assert.equal(manager.includes("listing_purchased"), true);
  assert.equal(manager.includes("holding_verified"), true);
  assert.equal(manager.includes("purchase_received"), true);
  assert.equal(manager.includes("operator_listing_pending"), false);
  assert.equal(manager.length, MEMBER_EMAIL_IDS.length);
});

test("profile and account lists split personal mail from org mail", () => {
  const member = {
    isOrgMember: true,
    isOrgManager: false,
  };
  const profileMember = profileNotificationEmailIds(member);
  const accountMember = accountNotificationEmailIds(member);
  assert.equal(profileMember.includes("listing_alert"), true);
  assert.equal(profileMember.includes("member_added"), true);
  assert.equal(profileMember.includes("purchase_received"), false);
  assert.equal(profileMember.includes("payment_received"), false);
  assert.equal(profileMember.includes("order_settled"), false);
  assert.equal(profileMember.includes("bid_placed"), false);
  assert.equal(profileMember.includes("bid_outbid"), false);
  assert.equal(profileMember.includes("holding_verified"), false);
  assert.equal(accountMember.includes("holding_verified"), true);
  assert.equal(accountMember.includes("payment_received"), true);
  assert.equal(accountMember.includes("purchase_received"), true);
  assert.equal(accountMember.includes("bid_outbid"), true);
  assert.equal(accountMember.includes("listing_alert"), false);

  const none = profileNotificationEmailIds({
    isOrgMember: false,
    isOrgManager: false,
  });
  assert.equal(none.includes("listing_alert"), true);
  assert.equal(none.includes("purchase_received"), false);

  const manager = profileNotificationEmailIds({
    isOrgMember: true,
    isOrgManager: true,
  });
  const accountManager = accountNotificationEmailIds({
    isOrgMember: true,
    isOrgManager: true,
  });
  assert.equal(manager.includes("listing_purchased"), false);
  assert.equal(accountManager.includes("listing_purchased"), true);
  assert.equal(accountManager.includes("holding_verified"), true);
  assert.equal(accountManager.includes("listing_alert"), false);
});

test("parseDisabledProductEmails keeps known product ids", () => {
  assert.deepEqual(parseDisabledProductEmails(["holding_verified", "nope"]), [
    "holding_verified",
  ]);
  assert.deepEqual(parseDisabledProductEmails(null), []);
  assert.equal(
    parseDisabledProductEmails(["operator_holding_pending"]).length,
    0,
  );
});

test("isAccountNotificationEmailId includes shared buyer trade mail and seller mail", () => {
  assert.equal(isAccountNotificationEmailId("holding_verified"), true);
  assert.equal(isAccountNotificationEmailId("listing_purchased"), true);
  assert.equal(isAccountNotificationEmailId("order_settled"), true);
  assert.equal(isAccountNotificationEmailId("purchase_received"), true);
  assert.equal(isAccountNotificationEmailId("bid_placed"), true);
  assert.equal(isAccountNotificationEmailId("bid_outbid"), true);
  assert.equal(isAccountNotificationEmailId("listing_alert"), false);
  assert.equal(isAccountNotificationEmailId("member_added"), false);
});

test("notificationAudiences depends on which list the row sits on", () => {
  assert.deepEqual(notificationAudiences("member_added", "profile"), ["you"]);
  assert.deepEqual(notificationAudiences("listing_alert", "profile"), ["you"]);
  assert.deepEqual(notificationAudiences("purchase_received", "profile"), [
    "you",
  ]);
  assert.deepEqual(notificationAudiences("bid_placed", "profile"), ["you"]);
  assert.deepEqual(notificationAudiences("purchase_received", "account"), [
    "account_roles",
  ]);
  assert.deepEqual(notificationAudiences("bid_placed", "account"), [
    "account_roles",
  ]);
  assert.deepEqual(notificationAudiences("bid_outbid", "account"), [
    "account_roles",
  ]);
  assert.deepEqual(notificationAudiences("holding_verified", "account"), [
    "account_roles",
  ]);
  assert.deepEqual(notificationAudiences("auction_ending_soon", "account"), [
    "account_roles",
  ]);
  assert.deepEqual(notificationAudiences("payment_received", "account"), [
    "account_roles",
  ]);
  assert.deepEqual(notificationAudiences("order_settled", "account"), [
    "account_roles",
  ]);
  assert.deepEqual(notificationAudiences("payment_received", "profile"), [
    "you",
  ]);
  assert.deepEqual(notificationAudiences("order_settled", "profile"), ["you"]);
  assert.equal(notificationAudienceLabel("you"), "You");
  assert.equal(notificationAudienceLabel("account_roles"), "Business roles");
});

test("groupedNotificationIds keeps related sections and drops empty ones", () => {
  const groups = groupedNotificationIds(PROFILE_NOTIFICATION_GROUPS, [
    "member_added",
    "listing_alert",
    "bid_placed",
  ]);
  assert.deepEqual(
    groups.map((group) => group.label),
    ["Membership", "Listing alerts"],
  );
  assert.deepEqual(groups[0]?.ids, ["member_added"]);
  assert.equal(
    groupedNotificationIds(PROFILE_NOTIFICATION_GROUPS, []).length,
    0,
  );
});

test("settlement copy differs for buyer and seller", () => {
  const input = {
    orderId: 1001,
    offeringLabel: "Sale",
    amount: "$750.00",
    orderUrl: "https://example.test/orders/1001",
    forSeller: false,
  };
  const buyer = emailCopy.order_settled(input);
  const seller = emailCopy.order_settled({ ...input, forSeller: true });
  assert.notEqual(buyer.paragraphs[0], seller.paragraphs[0]);
  assert.match(seller.paragraphs[0] ?? "", /FQX to you/);
});
