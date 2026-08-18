import "server-only";

import { listingAlertEmails } from "@/lib/alerts/queries";
import { emailCopy } from "@/lib/email/copy";
import { claimEmailDispatch, notifyEmail, siteUrlOrEmpty } from "@/lib/email/notify";
import {
  organisationManagerEmails,
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
import type { Order } from "@/lib/orders/types";
import { orderStatusLabel } from "@/lib/orders/types";
import type { Bid } from "@/lib/auctions/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function listingUrl(siteUrl: string, listing: Pick<Listing, "id" | "listing_type">) {
  return `${siteUrl}${listingHref(listing)}`;
}

export async function notifyListingCreated(listing: Listing) {
  const siteUrl = await siteUrlOrEmpty();
  const managers = await organisationManagerEmails(listing.organisation_id);
  const to = [...managers, listing.created_by_email];
  const href = listingUrl(siteUrl, listing);

  if (listing.status === "PENDING_APPROVAL") {
    await notifyEmail(
      "listing_submitted",
      to,
      emailCopy.listing_submitted({
        fisheryName: listing.fishery_name,
        listingUrl: href,
      }),
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
    await notifyEmail(
      "auction_published",
      to,
      emailCopy.auction_published({
        fisheryName: listing.fishery_name,
        auctionUrl: href,
      }),
    );
    await notifyNewListingAlert(listing);
    return;
  }

  await notifyEmail(
    "listing_published",
    to,
    emailCopy.listing_published({
      fisheryName: listing.fishery_name,
      listingUrl: href,
    }),
  );
  await notifyNewListingAlert(listing);
}

export async function notifyListingPublished(listing: Listing) {
  const siteUrl = await siteUrlOrEmpty();
  const to = [
    ...(await organisationManagerEmails(listing.organisation_id)),
    listing.created_by_email,
  ];
  const href = listingUrl(siteUrl, listing);

  if (listing.listing_type === "AUCTION") {
    await notifyEmail(
      "auction_published",
      to,
      emailCopy.auction_published({
        fisheryName: listing.fishery_name,
        auctionUrl: href,
      }),
    );
    await notifyNewListingAlert(listing);
    return;
  }

  await notifyEmail(
    "listing_published",
    to,
    emailCopy.listing_published({
      fisheryName: listing.fishery_name,
      listingUrl: href,
    }),
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
      listingUrl: href,
    }),
  );
}

export async function notifyListingRejected(listing: Listing, note: string) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "listing_rejected",
    [
      ...(await organisationManagerEmails(listing.organisation_id)),
      listing.created_by_email,
    ],
    emailCopy.listing_rejected({
      fisheryName: listing.fishery_name,
      note,
      listingUrl: listingUrl(siteUrl, listing),
    }),
  );
}

export async function notifyListingCancelled(listing: Listing) {
  const siteUrl = await siteUrlOrEmpty();
  const to = [
    ...(await organisationManagerEmails(listing.organisation_id)),
    listing.created_by_email,
  ];
  const href = listingUrl(siteUrl, listing);

  if (listing.listing_type === "AUCTION") {
    await notifyEmail(
      "auction_cancelled",
      to,
      emailCopy.auction_cancelled({
        fisheryName: listing.fishery_name,
        auctionUrl: href,
      }),
    );
    return;
  }

  await notifyEmail(
    "listing_cancelled",
    to,
    emailCopy.listing_cancelled({
      fisheryName: listing.fishery_name,
      listingUrl: href,
    }),
  );
}

export async function notifyOrderCreated(order: Order, listing: Listing) {
  const siteUrl = await siteUrlOrEmpty();
  const orderUrl = `${siteUrl}/orders/${order.id}`;
  const sellers = await organisationManagerEmails(order.seller_organisation_id);
  const buyers = uniqueEmails([
    ...(await organisationManagerEmails(order.buyer_organisation_id)),
    order.created_by_email,
  ]);

  await notifyEmail(
    "listing_purchased",
    sellers,
    emailCopy.listing_purchased({
      fisheryName: listing.fishery_name,
      orderUrl,
    }),
  );
  await notifyEmail(
    "purchase_received",
    buyers,
    emailCopy.purchase_received({
      fisheryName: listing.fishery_name,
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
  bidderEmail: string;
  bidderOrganisationId: number;
  previous: Bid | null;
}) {
  const siteUrl = await siteUrlOrEmpty();
  const auctionUrl = listingUrl(siteUrl, input.listing);
  const amount = formatAud(input.amount);

  await notifyEmail(
    "bid_placed",
    input.bidderEmail,
    emailCopy.bid_placed({
      fisheryName: input.listing.fishery_name,
      amount,
      auctionUrl,
    }),
  );

  if (input.previous && input.previous.organisation_id !== input.bidderOrganisationId) {
    await notifyEmail(
      "bid_outbid",
      await organisationManagerEmails(input.previous.organisation_id),
      emailCopy.bid_outbid({
        fisheryName: input.listing.fishery_name,
        auctionUrl,
      }),
    );
  }

  await notifyEmail(
    "auction_new_bid",
    await organisationManagerEmails(input.listing.organisation_id),
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
  const sellers = [
    ...(await organisationManagerEmails(input.listing.organisation_id)),
    input.listing.created_by_email,
  ];

  if (!input.order) {
    await notifyEmail(
      "auction_unsold",
      sellers,
      emailCopy.auction_unsold({
        fisheryName: input.listing.fishery_name,
        auctionUrl,
      }),
    );
    return;
  }

  const winnerOrg = input.order.buyer_organisation_id;
  await notifyEmail(
    "auction_won",
    uniqueEmails([
      ...(await organisationManagerEmails(winnerOrg)),
      input.order.created_by_email,
    ]),
    emailCopy.auction_won({
      fisheryName: input.listing.fishery_name,
      orderUrl: `${siteUrl}/orders/${input.order.id}`,
    }),
  );
  await notifyEmail(
    "listing_purchased",
    sellers,
    emailCopy.listing_purchased({
      fisheryName: input.listing.fishery_name,
      orderUrl: `${siteUrl}/orders/${input.order.id}`,
    }),
  );

  const otherOrgs = [
    ...new Set(
      input.bids
        .map((bid) => bid.organisation_id)
        .filter((id) => id !== winnerOrg),
    ),
  ];
  for (const organisationId of otherOrgs) {
    await notifyEmail(
      "auction_not_won",
      await organisationManagerEmails(organisationId),
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
  await notifyEmail(
    "payment_received",
    uniqueEmails([
      ...(await organisationManagerEmails(order.buyer_organisation_id)),
      ...(await organisationManagerEmails(order.seller_organisation_id)),
      order.created_by_email,
    ]),
    emailCopy.payment_received({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
  );
  await notifyOperatorOrderPending(order, siteUrl);
}

export async function notifyBankDebitSubmitted(order: Order) {
  if (!(await claimEmailDispatch("bank_debit_submitted", String(order.id)))) {
    return;
  }

  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "bank_debit_submitted",
    uniqueEmails([
      ...(await organisationManagerEmails(order.buyer_organisation_id)),
      order.created_by_email,
    ]),
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
  await notifyEmail(
    "checkout_expired",
    uniqueEmails([
      ...(await organisationManagerEmails(order.buyer_organisation_id)),
      order.created_by_email,
    ]),
    emailCopy.checkout_expired({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
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
  const siteUrl = await siteUrlOrEmpty();
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

export async function notifySettlementFailed(order: Order) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "settlement_failed",
    uniqueEmails([
      ...(await organisationManagerEmails(order.buyer_organisation_id)),
      ...(await organisationManagerEmails(order.seller_organisation_id)),
      order.created_by_email,
    ]),
    emailCopy.settlement_failed({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
  );
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
  await notifyEmail(
    "transfer_in_progress",
    uniqueEmails([
      ...(await organisationManagerEmails(order.buyer_organisation_id)),
      ...(await organisationManagerEmails(order.seller_organisation_id)),
      order.created_by_email,
    ]),
    emailCopy.transfer_in_progress({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
  );
  await notifyOperatorOrderPending(order, siteUrl);
}

export async function notifyTransferComplete(order: Order) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "transfer_complete",
    uniqueEmails([
      ...(await organisationManagerEmails(order.buyer_organisation_id)),
      ...(await organisationManagerEmails(order.seller_organisation_id)),
      order.created_by_email,
    ]),
    emailCopy.transfer_complete({
      orderId: order.id,
      orderUrl: `${siteUrl}/orders/${order.id}`,
    }),
  );
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
  await notifyEmail(
    "payments_setup_complete",
    await organisationManagerEmails(organisationId),
    emailCopy.payments_setup_complete({
      accountName,
      paymentsUrl: `${siteUrl}/dashboard/payments?account=${organisationId}`,
    }),
  );
}

export async function notifyHoldingVerified(input: {
  organisationId: number;
  fisheryName: string;
  holdingId: number;
}) {
  const siteUrl = await siteUrlOrEmpty();
  await notifyEmail(
    "holding_verified",
    await organisationManagerEmails(input.organisationId),
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
  await notifyEmail(
    "holding_needs_changes",
    await organisationManagerEmails(input.organisationId),
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
