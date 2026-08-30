import "server-only";

import { emailCopy } from "@/lib/email/copy";
import { claimEmailDispatch, notifyAccountEmail, siteUrlOrEmpty } from "@/lib/email/notify";
import { listingHref, type Listing } from "@/lib/listings/types";
import { createServiceClient } from "@/lib/supabase/service";

const ENDING_SOON_MS = 24 * 60 * 60 * 1000;
const PAYMENT_REMINDER_MS = 24 * 60 * 60 * 1000;

export async function runScheduledEmails() {
  const supabase = createServiceClient();
  const siteUrl = await siteUrlOrEmpty();

  if (!supabase || !siteUrl) {
    return { skipped: true as const };
  }

  const now = Date.now();
  const { data: listings } = await supabase
    .from("listings")
    .select(
      "id, organisation_id, listing_type, status, fishery_name, expires_at, created_by_email",
    )
    .eq("status", "PUBLISHED");

  for (const row of listings ?? []) {
    const listing = row as Pick<
      Listing,
      | "id"
      | "organisation_id"
      | "listing_type"
      | "status"
      | "fishery_name"
      | "expires_at"
      | "created_by_email"
    >;
    const href = `${siteUrl}${listingHref(listing)}`;
    const expires = new Date(listing.expires_at).getTime();
    const extra = [listing.created_by_email];

    if (
      listing.listing_type === "FIXED_PRICE" &&
      expires <= now &&
      (await claimEmailDispatch("listing_expired", String(listing.id)))
    ) {
      await notifyAccountEmail(
        "listing_expired",
        listing.organisation_id,
        emailCopy.listing_expired({
          fisheryName: listing.fishery_name,
          listingUrl: href,
        }),
        extra,
      );
    }

    if (
      listing.listing_type === "AUCTION" &&
      expires > now &&
      expires <= now + ENDING_SOON_MS &&
      (await claimEmailDispatch("auction_ending_soon", String(listing.id)))
    ) {
      const copy = emailCopy.auction_ending_soon({
        fisheryName: listing.fishery_name,
        auctionUrl: href,
      });
      await notifyAccountEmail(
        "auction_ending_soon",
        listing.organisation_id,
        copy,
        extra,
      );
      const { data: bids } = await supabase
        .from("bids")
        .select("organisation_id")
        .eq("listing_id", listing.id);
      const bidderOrgs = [
        ...new Set(
          (bids ?? [])
            .map((bid) => Number(bid.organisation_id))
            .filter(
              (id) => Number.isInteger(id) && id !== listing.organisation_id,
            ),
        ),
      ];
      for (const organisationId of bidderOrgs) {
        await notifyAccountEmail("auction_ending_soon", organisationId, copy);
      }
    }
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("id, buyer_organisation_id, created_at")
    .eq("status", "AWAITING_PAYMENT");

  for (const row of orders ?? []) {
    const created = new Date(String(row.created_at)).getTime();

    if (
      created > now - PAYMENT_REMINDER_MS ||
      !(await claimEmailDispatch("payment_reminder", String(row.id)))
    ) {
      continue;
    }

    const organisationId = Number(row.buyer_organisation_id);

    if (!Number.isInteger(organisationId)) {
      continue;
    }

    await notifyAccountEmail(
      "payment_reminder",
      organisationId,
      emailCopy.payment_reminder({
        orderId: Number(row.id),
        orderUrl: `${siteUrl}/orders/${row.id}`,
      }),
    );
  }

  return { skipped: false as const };
}
