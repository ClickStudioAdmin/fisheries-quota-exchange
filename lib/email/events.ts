import "server-only";

import { listingAlertEmails } from "@/lib/alerts/queries";
import { emailCopy } from "@/lib/email/copy";
import type { EmailAttachment } from "@/lib/email/send";
import { claimEmailDispatch, notifyAccountEmail, notifyEmail, siteUrlOrEmpty } from "@/lib/email/notify";
import type { ProductEmailId } from "@/lib/email/product-emails";
import {
  organisationMemberEmails,
  platformAdminEmails,
  uniqueEmails,
} from "@/lib/email/recipients";
import {
  formatAud,
  listingHref,
  listingOfferingLabel,
  listingTypeLabel,
  type Listing,
} from "@/lib/listings/types";
import { formatQuantityWithUsage } from "@/lib/listings/quota-usage";
import type { NoticeEmailData } from "@/lib/email/types";
import type { Order } from "@/lib/orders/types";
import { orderStatusLabel } from "@/lib/orders/types";
import { accountPaymentsPath } from "@/lib/organisations/paths";
import type { Bid } from "@/lib/auctions/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCustodyReleaseRequest, getFishery, getHolding } from "@/lib/fisheries/queries";
import { getOrderJurisdictionCode } from "@/lib/transfers/queries";
import { getTransferProcess } from "@/lib/transfers/registry";

function listingUrl(siteUrl: string, listing: Pick<Listing, "id" | "listing_type">) {
  return `${siteUrl}${listingHref(listing)}`;
}

function quantityLabelFor(
  item: Pick<Listing | Order, "quantity" | "unit_label" | "unused_quantity" | "used_quantity">,
) {
  return formatQuantityWithUsage(
    item.quantity,
    item.unit_label,
    item.unused_quantity,
    item.used_quantity,
  );
}

async function notifyBuyerAndSeller(
  template: ProductEmailId,
  order: Order,
  data: NoticeEmailData,
) {
  await notifyAccountEmail(template, order.buyer_organisation_id, data);
  await notifyAccountEmail(template, order.seller_organisation_id, data);
}

async function notifyBuyerAndSellerCopies(
  template: ProductEmailId,
  order: Order,
  copyFor: (forSeller: boolean) => NoticeEmailData,
) {
  await notifyAccountEmail(
    template,
    order.buyer_organisation_id,
    copyFor(false),
  );
  await notifyAccountEmail(
    template,
    order.seller_organisation_id,
    copyFor(true),
  );
}

export async function notifyListingCreated(listing: Listing) {
  const siteUrl = await siteUrlOrEmpty();
  const extra = [listing.created_by_email];
  const href = listingUrl(siteUrl, listing);

  if (listing.status === "PENDING_APPROVAL") {
    await notifyAccountEmail(
      "listing_submitted",
      listing.organisation_id,
      emailCopy.listing_submitted({
        fisheryName: listing.fishery_name,
        listingUrl: href,
      }),
      extra,
    );
    await notifyEmail(
      "operator_listing_pending",
      await platformAdminEmails(),
      emailCopy.operator_listing_pending({
        listingId: listing.id,
        adminUrl: `${siteUrl}/admin/listings`,
      }),
    );
    return;
  }

  if (listing.status !== "PUBLISHED") {
    return;
  }

  if (listing.listing_type === "AUCTION") {
    await notifyAccountEmail(
      "auction_published",
      listing.organisation_id,
      emailCopy.auction_published({
        fisheryName: listing.fishery_name,
        auctionUrl: href,
      }),
      extra,
    );
    await notifyNewListingAlert(listing);
    return;
  }

  await notifyAccountEmail(
    "listing_published",
    listing.organisation_id,
    emailCopy.listing_published({
      fisheryName: listing.fishery_name,
      listingUrl: href,
    }),
    extra,
  );
  await notifyNewListingAlert(listing);
}

export async function notifyListingPublished(listing: Listing) {
  const siteUrl = await siteUrlOrEmpty();
  const extra = [listing.created_by_email];
  const href = listingUrl(siteUrl, listing);

  if (listing.listing_type === "AUCTION") {
    await notifyAccountEmail(
      "auction_published",
      listing.organisation_id,
      emailCopy.auction_published({
        fisheryName: listing.fishery_name,
        auctionUrl: href,
      }),
      extra,
    );
    await notifyNewListingAlert(listing);
    return;
  }

  await notifyAccountEmail(
    "listing_published",
    listing.organisation_id,
    emailCopy.listing_published({
      fisheryName: listing.fishery_name,
      listingUrl: href,
    }),
    extra,
  );
  await notifyNewListingAlert(listing);
}

async function notifyNewListingAlert(listing: Listing) {
  const supabase = createServiceClient() ?? (await createClient());

  if (!supabase) {
    return;
  }

  const { data: holding } = await supabase
    .from("quota_holdings")
    .select("fishery_id, organisation_id")
    .eq("id", listing.holding_id)
    .maybeSingle();

  if (!holding) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  const href = listingUrl(siteUrl, listing);
  const sellers = await organisationMemberEmails(listing.organisation_id);
  const exclude = new Set(uniqueEmails([...sellers, listing.created_by_email]));
  const subscribers = (await listingAlertEmails(
    Number(holding.fishery_id),
    listing.offering,
  )).filter((email) => !exclude.has(email));

  await notifyEmail(
    "listing_alert",
    subscribers,
    emailCopy.listing_alert({
      fisheryName: listing.fishery_name,
      offeringLabel: listingOfferingLabel(listing.offering),
      listingTypeLabel: listingTypeLabel(listing.listing_type),
      quantityLabel: quantityLabelFor(listing),
      listingUrl: href,
    }),
  );
}

export async function notifyListingRejected(listing: Listing, note: string) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "listing_rejected",
    listing.organisation_id,
    emailCopy.listing_rejected({
      fisheryName: listing.fishery_name,
      note,
      listingUrl: listingUrl(siteUrl, listing),
    }),
    [listing.created_by_email],
  );
}

export async function notifyListingCancelled(listing: Listing) {
  const siteUrl = await siteUrlOrEmpty();
  const extra = [listing.created_by_email];
  const href = listingUrl(siteUrl, listing);

  if (listing.listing_type === "AUCTION") {
    await notifyAccountEmail(
      "auction_cancelled",
      listing.organisation_id,
      emailCopy.auction_cancelled({
        fisheryName: listing.fishery_name,
        auctionUrl: href,
      }),
      extra,
    );
    return;
  }

  await notifyAccountEmail(
    "listing_cancelled",
    listing.organisation_id,
    emailCopy.listing_cancelled({
      fisheryName: listing.fishery_name,
      listingUrl: href,
    }),
    extra,
  );
}

export async function notifyOrderCreated(order: Order, listing: Listing) {
  const siteUrl = await siteUrlOrEmpty();
  const orderUrl = `${siteUrl}/orders/${order.id}`;
  await notifyAccountEmail(
    "listing_purchased",
    order.seller_organisation_id,
    emailCopy.listing_purchased({
      fisheryName: listing.fishery_name,
      quantityLabel: quantityLabelFor(order),
      orderUrl,
    }),
    [listing.created_by_email],
  );
  await notifyAccountEmail(
    "purchase_received",
    order.buyer_organisation_id,
    emailCopy.purchase_received({
      fisheryName: listing.fishery_name,
      quantityLabel: quantityLabelFor(order),
      orderUrl,
    }),
  );

  if (order.status === "AWAITING_COMPLIANCE") {
    await notifyOperatorOrderPending(order, siteUrl);
  }
}

export async function notifyBidPlaced(input: {
  listing: Listing;
  amount: number;
  bidderOrganisationId: number;
  previous: Bid | null;
}) {
  const siteUrl = await siteUrlOrEmpty();
  const auctionUrl = listingUrl(siteUrl, input.listing);
  const amount = formatAud(input.amount);

  await notifyAccountEmail(
    "bid_placed",
    input.bidderOrganisationId,
    emailCopy.bid_placed({
      fisheryName: input.listing.fishery_name,
      amount,
      auctionUrl,
    }),
  );

  if (input.previous && input.previous.organisation_id !== input.bidderOrganisationId) {
    await notifyAccountEmail(
      "bid_outbid",
      input.previous.organisation_id,
      emailCopy.bid_outbid({
        fisheryName: input.listing.fishery_name,
        auctionUrl,
      }),
    );
  }

  await notifyAccountEmail(
    "auction_new_bid",
    input.listing.organisation_id,
    emailCopy.auction_new_bid({
      fisheryName: input.listing.fishery_name,
      amount,
      auctionUrl,
    }),
  );
}

export async function notifyAuctionClosed(input: {
  listing: Listing;
  bids: Bid[];
  order: Order | null;
}) {
  const siteUrl = await siteUrlOrEmpty();
  const auctionUrl = listingUrl(siteUrl, input.listing);
  const extra = [input.listing.created_by_email];

  if (!input.order) {
    await notifyAccountEmail(
      "auction_unsold",
      input.listing.organisation_id,
      emailCopy.auction_unsold({
        fisheryName: input.listing.fishery_name,
        auctionUrl,
      }),
      extra,
    );
    return;
  }

  const winnerOrg = input.order.buyer_organisation_id;
  await notifyAccountEmail(
    "auction_won",
    winnerOrg,
    emailCopy.auction_won({
      fisheryName: input.listing.fishery_name,
      quantityLabel: quantityLabelFor(input.order),
      orderUrl: `${siteUrl}/orders/${input.order.id}`,
    }),
  );
  await notifyAccountEmail(
    "listing_purchased",
    input.listing.organisation_id,
    emailCopy.listing_purchased({
      fisheryName: input.listing.fishery_name,
      quantityLabel: quantityLabelFor(input.order),
      orderUrl: `${siteUrl}/orders/${input.order.id}`,
    }),
    extra,
  );

  const otherOrgs = [
    ...new Set(
      input.bids
        .map((bid) => bid.organisation_id)
        .filter((id) => id !== winnerOrg),
    ),
  ];
  for (const organisationId of otherOrgs) {
    await notifyAccountEmail(
      "auction_not_won",
      organisationId,
      emailCopy.auction_not_won({
        fisheryName: input.listing.fishery_name,
        auctionUrl,
      }),
    );
  }

  if (input.order.status === "AWAITING_COMPLIANCE") {
    await notifyOperatorOrderPending(input.order, siteUrl);
  }
}

export async function notifyPaymentReceived(order: Order) {
  if (!(await claimEmailDispatch("payment_received", String(order.id)))) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  const data = emailCopy.payment_received({
    orderId: order.id,
    orderUrl: `${siteUrl}/orders/${order.id}`,
  });
  await notifyBuyerAndSeller("payment_received", order, data);
  const jurisdictionCode = await getOrderJurisdictionCode(order);
  const process = getTransferProcess(jurisdictionCode, order.offering);
  if (process.usesFishNetOutbound && order.status === "AWAITING_TRANSFER") {
    await notifyLeaseOutboundReady(order);
  } else {
    await notifyOperatorOrderPending(order, siteUrl);
  }
}

export async function notifyBankDebitSubmitted(order: Order) {
  if (!(await claimEmailDispatch("bank_debit_submitted", String(order.id)))) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "bank_debit_submitted",
    order.buyer_organisation_id,
    emailCopy.bank_debit_submitted({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
  );
}

export async function notifyCheckoutExpired(order: Order) {
  if (!(await claimEmailDispatch("checkout_expired", String(order.id)))) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  const orderUrl = `${siteUrl}/orders/${order.id}`;
  await notifyBuyerAndSellerCopies("checkout_expired", order, (forSeller) =>
    emailCopy.checkout_expired({
      orderId: order.id,
      orderUrl,
      forSeller,
    }),
  );
  await notifyEmail(
    "operator_payment_exception",
    await platformAdminEmails(),
    emailCopy.operator_payment_exception({
      orderId: order.id,
      detail: "Unpaid checkout expired. The order was cancelled and quota released.",
      adminUrl: `${siteUrl}/admin/orders`,
    }),
  );
}

export async function notifyPaymentFailed(order: Order) {
  if (!(await claimEmailDispatch("payment_failed", String(order.id)))) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  const orderUrl = `${siteUrl}/orders/${order.id}`;
  await notifyBuyerAndSellerCopies("payment_failed", order, (forSeller) =>
    emailCopy.payment_failed({
      orderId: order.id,
      orderUrl,
      forSeller,
    }),
  );
  await notifyEmail(
    "operator_payment_exception",
    await platformAdminEmails(),
    emailCopy.operator_payment_exception({
      orderId: order.id,
      detail: "Async bank debit failed. The unpaid order was cancelled.",
      adminUrl: `${siteUrl}/admin/orders`,
    }),
  );
}

export async function notifyComplianceRejected(order: Order, note: string) {
  if (!(await claimEmailDispatch("compliance_rejected", String(order.id)))) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  const orderUrl = `${siteUrl}/orders/${order.id}`;
  await notifyBuyerAndSellerCopies("compliance_rejected", order, (forSeller) =>
    emailCopy.compliance_rejected({
      orderId: order.id,
      orderUrl,
      note,
      forSeller,
    }),
  );
}

export async function notifyComplianceUpdateRequested(
  order: Order,
  notes: { buyerNote: string | null; sellerNote: string | null },
) {
  const siteUrl = await siteUrlOrEmpty();
  const orderUrl = `${siteUrl}/orders/${order.id}`;

  if (notes.buyerNote) {
    await notifyAccountEmail(
      "compliance_update_requested",
      order.buyer_organisation_id,
      emailCopy.compliance_update_requested({
        orderId: order.id,
        orderUrl,
        note: notes.buyerNote,
      }),
    );
  }

  if (notes.sellerNote) {
    await notifyAccountEmail(
      "compliance_update_requested",
      order.seller_organisation_id,
      emailCopy.compliance_update_requested({
        orderId: order.id,
        orderUrl,
        note: notes.sellerNote,
      }),
    );
  }
}

export async function notifySettlementFailed(order: Order) {
  const siteUrl = await siteUrlOrEmpty();
  const data = emailCopy.settlement_failed({
    orderId: order.id,
    orderUrl: `${siteUrl}/orders/${order.id}`,
  });
  await notifyBuyerAndSeller("settlement_failed", order, data);
  await notifyEmail(
    "operator_payment_exception",
    await platformAdminEmails(),
    emailCopy.operator_payment_exception({
      orderId: order.id,
      detail: "Seller settlement transfer failed. Quota settlement was not completed.",
      adminUrl: `${siteUrl}/admin/orders`,
    }),
  );
}

export async function notifyTransferInProgress(order: Order) {
  const siteUrl = await siteUrlOrEmpty();
  const jurisdictionCode = await getOrderJurisdictionCode(order);
  const process = getTransferProcess(jurisdictionCode, order.offering);
  const prepareDocuments = !process.usesSimulatedTransfer;
  const signOnline = order.qld_signing_channel === "PANDADOC";
  await notifyBuyerAndSellerCopies("transfer_in_progress", order, (forSeller) =>
    emailCopy.transfer_in_progress({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
      prepareDocuments,
      forSeller,
      signOnline,
    }),
  );
  await notifyOperatorOrderPending(order, siteUrl);
}

export async function notifyTransferApplicationReady(
  order: Order,
  attachment: { filename: string; pdf: Buffer; documentId: number },
) {
  if (
    !(await claimEmailDispatch(
      "transfer_application_ready",
      `${order.id}:doc:${attachment.documentId}`,
    ))
  ) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  const attachments: EmailAttachment[] = [
    { filename: attachment.filename, content: attachment.pdf },
  ];
  const data = emailCopy.transfer_application_ready({
    orderId: order.id,
    orderUrl: `${siteUrl}/orders/${order.id}`,
    formTitle:
      order.offering === "LEASE"
        ? "The Queensland custodial lease paperwork"
        : "The Queensland FDU1465 transfer application",
  });
  await notifyAccountEmail(
    "transfer_application_ready",
    order.seller_organisation_id,
    data,
    undefined,
    attachments,
  );
}

export async function notifyTransferSignOnlineReady(
  order: Order,
  documentId: number,
) {
  if (
    !(await claimEmailDispatch(
      "transfer_sign_online_ready",
      `${order.id}:doc:${documentId}`,
    ))
  ) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  const data = emailCopy.transfer_sign_online_ready({
    orderId: order.id,
    orderUrl: `${siteUrl}/orders/${order.id}`,
    formTitle:
      order.offering === "LEASE"
        ? "The Queensland custodial lease paperwork"
        : "The Queensland FDU1465 transfer application",
  });
  await notifyBuyerAndSeller("transfer_sign_online_ready", order, data);
}

export async function notifyTransferRecipientSigned(
  order: Order,
  input: { organisationId: number; waitingOnOther: boolean },
) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "transfer_recipient_signed",
    input.organisationId,
    emailCopy.transfer_recipient_signed({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
      waitingOnOther: input.waitingOnOther,
    }),
  );
}

export async function notifyTransferOnlinePackReady(order: Order) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyBuyerAndSeller(
    "transfer_online_pack_ready",
    order,
    emailCopy.transfer_online_pack_ready({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
  );
  await notifyOperatorOrderPending(order, siteUrl);
}

export async function notifyTransferSellerSignedReceived(order: Order) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "transfer_seller_signed_received",
    order.seller_organisation_id,
    emailCopy.transfer_seller_signed_received({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
  );
  await notifyOperatorOrderPending(order, siteUrl);
}

export async function notifyTransferBuyerFormReady(
  order: Order,
  attachment: { filename: string; pdf: Buffer; documentId: number },
) {
  if (
    !(await claimEmailDispatch(
      "transfer_buyer_form_ready",
      `${order.id}:doc:${attachment.documentId}`,
    ))
  ) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  const data = emailCopy.transfer_buyer_form_ready({
    orderId: order.id,
    orderUrl: `${siteUrl}/orders/${order.id}`,
    formTitle:
      order.offering === "LEASE"
        ? "The Queensland custodial lease paperwork"
        : "The Queensland FDU1465 transfer application",
  });
  await notifyAccountEmail(
    "transfer_buyer_form_ready",
    order.buyer_organisation_id,
    data,
    undefined,
    [{ filename: attachment.filename, content: attachment.pdf }],
  );
}

export async function notifyTransferBuyerSignedReceived(order: Order) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "transfer_buyer_signed_received",
    order.buyer_organisation_id,
    emailCopy.transfer_buyer_signed_received({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
  );
  await notifyOperatorOrderPending(order, siteUrl);
}

export async function notifyTransferSellerPackReturned(
  order: Order,
  note: string,
) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "transfer_seller_pack_returned",
    order.seller_organisation_id,
    emailCopy.transfer_seller_pack_returned({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
      note,
    }),
  );
}

export async function notifyTransferComplete(order: Order) {
  const siteUrl = await siteUrlOrEmpty();
  const data = emailCopy.transfer_complete({
    orderId: order.id,
    orderUrl: `${siteUrl}/orders/${order.id}`,
  });
  await notifyBuyerAndSeller("transfer_complete", order, data);
  await notifyOperatorOrderPending(order, siteUrl);
}

export async function notifyTransferException(order: Order, detail: string) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "operator_transfer_exception",
    await platformAdminEmails(),
    emailCopy.operator_transfer_exception({
      orderId: order.id,
      detail,
      adminUrl: `${siteUrl}/admin/orders`,
    }),
  );
}

export async function notifyPaymentsSetupComplete(organisationId: number, accountName: string) {
  if (!(await claimEmailDispatch("payments_setup_complete", String(organisationId)))) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "payments_setup_complete",
    organisationId,
    emailCopy.payments_setup_complete({
      accountName,
      paymentsUrl: `${siteUrl}${accountPaymentsPath(organisationId)}`,
    }),
  );
}

export async function notifyHoldingVerified(input: {
  organisationId: number;
  fisheryName: string;
  holdingId: number;
}) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "holding_verified",
    input.organisationId,
    emailCopy.holding_verified({
      fisheryName: input.fisheryName,
      holdingUrl: `${siteUrl}/dashboard/holdings/${input.holdingId}`,
    }),
  );
}

export async function notifyHoldingNeedsChanges(input: {
  organisationId: number;
  fisheryName: string;
  holdingId: number;
  note: string;
}) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "holding_needs_changes",
    input.organisationId,
    emailCopy.holding_needs_changes({
      fisheryName: input.fisheryName,
      note: input.note,
      holdingUrl: `${siteUrl}/dashboard/holdings/${input.holdingId}`,
    }),
  );
}

export async function notifyHoldingPending(holdingId: number) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "operator_holding_pending",
    await platformAdminEmails(),
    emailCopy.operator_holding_pending({
      holdingId,
      adminUrl: `${siteUrl}/admin/holdings`,
    }),
  );
}

export async function notifyCustodyInboundRequested(holdingId: number) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "custody_inbound_requested",
    await platformAdminEmails(),
    emailCopy.custody_inbound_requested({
      holdingId,
      adminUrl: `${siteUrl}/admin/holdings`,
    }),
  );
}

export async function notifyCustodyInboundVerified(input: {
  organisationId: number;
  fisheryName: string;
  holdingId: number;
}) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "custody_inbound_verified",
    input.organisationId,
    emailCopy.custody_inbound_verified({
      fisheryName: input.fisheryName,
      holdingUrl: `${siteUrl}/dashboard/holdings/${input.holdingId}`,
    }),
  );
}

export async function notifyCustodyInboundCancelled(input: {
  organisationId: number;
  fisheryName: string;
  holdingId: number;
}) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "custody_inbound_cancelled",
    input.organisationId,
    emailCopy.custody_inbound_cancelled({
      fisheryName: input.fisheryName,
      holdingUrl: `${siteUrl}/dashboard/holdings`,
    }),
  );
}

export async function notifyCustodyReleaseRequested(requestId: number) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "custody_release_requested",
    await platformAdminEmails(),
    emailCopy.custody_release_requested({
      requestId,
      adminUrl: `${siteUrl}/admin/holdings`,
    }),
  );
}

export async function notifyCustodyReleaseCompleted(requestId: number) {
  const request = await getCustodyReleaseRequest(requestId);
  if (!request) {
    return;
  }

  const holding = await getHolding(request.holding_id);
  const fishery = holding ? await getFishery(holding.fishery_id) : null;
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "custody_release_completed",
    request.organisation_id,
    emailCopy.custody_release_completed({
      fisheryName: fishery?.name ?? "Holding",
      quantityLabel: `${request.quantity} ${fishery ? (fishery.quantity_type === "KG" ? "kg" : "units") : "units"}`,
      holdingUrl: `${siteUrl}/dashboard/holdings/${request.holding_id}`,
    }),
  );
}

export async function notifyCustodyReleaseCancelled(requestId: number) {
  const request = await getCustodyReleaseRequest(requestId);
  if (!request) {
    return;
  }

  const holding = await getHolding(request.holding_id);
  const fishery = holding ? await getFishery(holding.fishery_id) : null;
  const siteUrl = await siteUrlOrEmpty();
  await notifyAccountEmail(
    "custody_release_cancelled",
    request.organisation_id,
    emailCopy.custody_release_cancelled({
      fisheryName: fishery?.name ?? "Holding",
      holdingUrl: `${siteUrl}/dashboard/holdings/${request.holding_id}`,
    }),
  );
}

export async function notifyLeaseOutboundReady(order: Order) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "lease_outbound_ready",
    await platformAdminEmails(),
    emailCopy.lease_outbound_ready({
      orderId: order.id,
      adminUrl: `${siteUrl}/admin/orders`,
    }),
  );
}

async function notifyOperatorOrderPending(order: Order, siteUrl: string) {
  await notifyEmail(
    "operator_order_pending",
    await platformAdminEmails(),
    emailCopy.operator_order_pending({
      orderId: order.id,
      status: orderStatusLabel(order.status).toLowerCase(),
      adminUrl: `${siteUrl}/admin/orders`,
    }),
  );
}
