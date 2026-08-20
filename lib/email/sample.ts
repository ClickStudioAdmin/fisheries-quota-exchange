import { emailCopy } from "@/lib/email/copy";
import type { ProductEmailId } from "@/lib/email/product-emails";
import type { NoticeEmailData } from "@/lib/email/types";

export function sampleEmailData(
  id: ProductEmailId,
  siteUrl: string,
): NoticeEmailData {
  const listingUrl = `${siteUrl}/marketplace/1`;
  const auctionUrl = `${siteUrl}/auctions/1`;
  const orderUrl = `${siteUrl}/orders/1001`;
  const holdingUrl = `${siteUrl}/dashboard/holdings/1`;
  const accountUrl = `${siteUrl}/organisations/1`;
  const paymentsUrl = `${siteUrl}/dashboard/account?tab=payments`;
  const adminHoldings = `${siteUrl}/admin/holdings`;
  const adminListings = `${siteUrl}/admin/listings`;
  const adminOrders = `${siteUrl}/admin/orders`;

  switch (id) {
    case "member_added":
      return emailCopy.member_added({
        accountName: "Sample Fisheries Pty Ltd",
        role: "Member",
        acceptUrl: `${siteUrl}/invitations/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
        registerUrl: `${siteUrl}/register`,
      });
    case "member_role_changed":
      return emailCopy.member_role_changed({
        accountName: "Sample Fisheries Pty Ltd",
        role: "Admin",
        accountUrl,
      });
    case "member_removed":
      return emailCopy.member_removed({
        accountName: "Sample Fisheries Pty Ltd",
        siteUrl,
      });
    case "ownership_transferred":
      return emailCopy.ownership_transferred({
        accountName: "Sample Fisheries Pty Ltd",
        accountUrl,
      });
    case "payments_setup_complete":
      return emailCopy.payments_setup_complete({
        accountName: "Sample Fisheries Pty Ltd",
        paymentsUrl,
      });
    case "holding_verified":
      return emailCopy.holding_verified({
        fisheryName: "Northern Prawn Fishery",
        holdingUrl,
      });
    case "holding_needs_changes":
      return emailCopy.holding_needs_changes({
        fisheryName: "Northern Prawn Fishery",
        note: "Please attach the current licence document.",
        holdingUrl,
      });
    case "listing_submitted":
      return emailCopy.listing_submitted({
        fisheryName: "Northern Prawn Fishery",
        listingUrl,
      });
    case "listing_published":
      return emailCopy.listing_published({
        fisheryName: "Northern Prawn Fishery",
        listingUrl,
      });
    case "listing_alert":
      return emailCopy.listing_alert({
        fisheryName: "Northern Prawn Fishery",
        offeringLabel: "Sale",
        listingTypeLabel: "Fixed price",
        listingUrl,
      });
    case "listing_rejected":
      return emailCopy.listing_rejected({
        fisheryName: "Northern Prawn Fishery",
        note: "Quantity does not match the verified holding.",
        listingUrl,
      });
    case "listing_expired":
      return emailCopy.listing_expired({
        fisheryName: "Northern Prawn Fishery",
        listingUrl,
      });
    case "listing_cancelled":
      return emailCopy.listing_cancelled({
        fisheryName: "Northern Prawn Fishery",
        listingUrl,
      });
    case "listing_purchased":
      return emailCopy.listing_purchased({
        fisheryName: "Northern Prawn Fishery",
        orderUrl,
      });
    case "purchase_received":
      return emailCopy.purchase_received({
        fisheryName: "Northern Prawn Fishery",
        orderUrl,
      });
    case "auction_published":
      return emailCopy.auction_published({
        fisheryName: "Northern Prawn Fishery",
        auctionUrl,
      });
    case "bid_placed":
      return emailCopy.bid_placed({
        fisheryName: "Northern Prawn Fishery",
        amount: "$18.75",
        auctionUrl,
      });
    case "bid_outbid":
      return emailCopy.bid_outbid({
        fisheryName: "Northern Prawn Fishery",
        auctionUrl,
      });
    case "auction_new_bid":
      return emailCopy.auction_new_bid({
        fisheryName: "Northern Prawn Fishery",
        amount: "$19.00",
        auctionUrl,
      });
    case "auction_won":
      return emailCopy.auction_won({
        fisheryName: "Northern Prawn Fishery",
        orderUrl,
      });
    case "auction_not_won":
      return emailCopy.auction_not_won({
        fisheryName: "Northern Prawn Fishery",
        auctionUrl,
      });
    case "auction_unsold":
      return emailCopy.auction_unsold({
        fisheryName: "Northern Prawn Fishery",
        auctionUrl,
      });
    case "auction_cancelled":
      return emailCopy.auction_cancelled({
        fisheryName: "Northern Prawn Fishery",
        auctionUrl,
      });
    case "auction_ending_soon":
      return emailCopy.auction_ending_soon({
        fisheryName: "Northern Prawn Fishery",
        auctionUrl,
      });
    case "payment_received":
      return emailCopy.payment_received({ orderId: 1001, orderUrl });
    case "bank_debit_submitted":
      return emailCopy.bank_debit_submitted({ orderId: 1001, orderUrl });
    case "settlement_failed":
      return emailCopy.settlement_failed({ orderId: 1001, orderUrl });
    case "checkout_expired":
      return emailCopy.checkout_expired({ orderId: 1001, orderUrl });
    case "payment_failed":
      return emailCopy.payment_failed({ orderId: 1001, orderUrl });
    case "payment_reminder":
      return emailCopy.payment_reminder({ orderId: 1001, orderUrl });
    case "transfer_in_progress":
      return emailCopy.transfer_in_progress({
        orderId: 1001,
        orderUrl,
        prepareDocuments: true,
      });
    case "transfer_application_ready":
      return emailCopy.transfer_application_ready({
        orderId: 1001,
        orderUrl,
        formTitle: "The Queensland FDU1465 transfer application",
      });
    case "compliance_rejected":
      return emailCopy.compliance_rejected({
        orderId: 1001,
        orderUrl,
        note: "Licence details do not match the holding.",
      });
    case "compliance_update_requested":
      return emailCopy.compliance_update_requested({
        orderId: 1001,
        orderUrl,
        note: "Please update the Queensland fisheries client number.",
      });
    case "transfer_complete":
      return emailCopy.transfer_complete({ orderId: 1001, orderUrl });
    case "order_settled":
      return emailCopy.order_settled({
        orderId: 1001,
        offeringLabel: "Sale",
        amount: "$750.00",
        orderUrl,
        forSeller: false,
      });
    case "operator_holding_pending":
      return emailCopy.operator_holding_pending({
        holdingId: 1,
        adminUrl: adminHoldings,
      });
    case "operator_listing_pending":
      return emailCopy.operator_listing_pending({
        listingId: 1,
        adminUrl: adminListings,
      });
    case "operator_order_pending":
      return emailCopy.operator_order_pending({
        orderId: 1001,
        status: "awaiting compliance",
        adminUrl: adminOrders,
      });
    case "operator_payment_exception":
      return emailCopy.operator_payment_exception({
        orderId: 1001,
        detail: "Async bank debit failed. The unpaid order was cancelled.",
        adminUrl: adminOrders,
      });
    case "operator_transfer_exception":
      return emailCopy.operator_transfer_exception({
        orderId: 1001,
        detail: "Simulated authority transfer failed.",
        adminUrl: adminOrders,
      });
  }
}
