import Link from "next/link";
import { notFound } from "next/navigation";
import { BidForm } from "@/components/bid-form";
import { SwitchAccountLink } from "@/components/switch-account-notice";
import { TermsRequiredNotice } from "@/components/terms-required-notice";
import { buttonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { AuctionCountdown } from "@/components/auction-countdown";
import { OfferCard } from "@/components/offer-card";
import { OfferDetailLayout } from "@/components/offer-detail-layout";
import { ListingRelatedMarket } from "@/components/listing-related-market";
import { LabeledFields, pageWidthClassName, panelClassName } from "@/components/surface";
import { formatTableDate } from "@/lib/format";
import { closeAuctionAction } from "@/lib/auctions/actions";
import { ensureAuctionClosed, listBids } from "@/lib/auctions/queries";
import {
  auctionHasEnded,
  auctionHasStarted,
  auctionIsLive,
  minimumBid,
} from "@/lib/auctions/types";
import { cancelListingAction } from "@/lib/listings/actions";
import { listFisheries } from "@/lib/fisheries/queries";
import { getListing } from "@/lib/listings/queries";
import {
  canCancelOpenListing,
  formatAud,
  listingStatusLabel,
} from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getActiveOrganisation } from "@/lib/organisations/active-session";
import { listMyOrganisations, getMyRole, loadPublicBuyerDisplays, loadPublicSellerDisplays } from "@/lib/organisations/queries";
import { PublicSellerName } from "@/components/public-seller-name";
import { canBuyForOrganisation } from "@/lib/organisations/permissions";
import { getOrderForListing } from "@/lib/orders/queries";
import { getUser } from "@/lib/supabase/server";
import { hasAcceptedCurrentTerms } from "@/lib/terms/queries";

export const metadata = {
  title: "Auction",
};

export default async function AuctionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId)) {
    notFound();
  }

  const initial = await getListing(listingId);

  if (!initial || initial.listing_type !== "AUCTION") {
    notFound();
  }

  const listing = await ensureAuctionClosed(initial);
  const [bids, order, fisheries] = await Promise.all([
    listBids(listing.id),
    getOrderForListing(listing.id),
    listFisheries(),
  ]);
  const fishery = fisheries.find((item) => item.name === listing.fishery_name);
  const user = await getUser();
  const role = user ? await getMyRole(listing.organisation_id) : null;
  const admin = user ? await isPlatformAdmin() : false;
  const organisations = user ? await listMyOrganisations() : [];
  const active = user ? await getActiveOrganisation() : null;
  const auctionPath = `/auctions/${listing.id}`;
  const canSwitch = organisations.length > 1;
  const operatingAsSeller = active?.id === listing.organisation_id;
  const acceptedTerms = user ? await hasAcceptedCurrentTerms() : false;
  const sellerDisplays = await loadPublicSellerDisplays([listing]);
  const sellerDisplay = sellerDisplays[listing.id] ?? {
    label: listing.seller_name,
    tooltip: null,
  };
  const bidderDisplays = await loadPublicBuyerDisplays(bids);
  const ended = auctionHasEnded(listing);
  const started = auctionHasStarted(listing);
  const live = auctionIsLive(listing);
  const canManage =
    admin ||
    (operatingAsSeller && (role === "OWNER" || role === "ADMIN"));
  const canCancel = canManage && canCancelOpenListing(listing, bids.length);
  const canClose =
    listing.status === "PUBLISHED" && ended && Boolean(user);
  const minBid = minimumBid(listing, bids.length);
  const isSeller = operatingAsSeller;

  return (
    <div className={`${pageWidthClassName} py-12 sm:py-16`}>
      <p className="text-sm text-ink-muted">
        <Link href="/marketplace" className="underline">
          Marketplace
        </Link>
      </p>
      <OfferDetailLayout
        actionTitle="Bid"
        action={
          listing.status === "PUBLISHED" && live ? (
            !user ? (
              <p className="text-sm text-ink-muted">
                <Link
                  href={`/login?next=/auctions/${listing.id}`}
                  className="underline"
                >
                  Log in
                </Link>{" "}
                to bid. Bid time is recorded by the server. If you win, you
                pay FQX in Stripe test mode.
              </p>
            ) : organisations.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Add your business details on{" "}
                <Link href="/dashboard/account" className="underline">
                  Business Settings
                </Link>{" "}
                before you can bid.
              </p>
            ) : !active ? (
              <p className="text-sm text-ink-muted">
                <SwitchAccountLink next={auctionPath}>
                  Choose a business
                </SwitchAccountLink>{" "}
                before you can bid.
              </p>
            ) : isSeller ? (
              <p className="text-sm text-ink-muted">
                You cannot bid on this auction while using the seller&apos;s
                business.
                {canSwitch ? (
                  <>
                    {" "}
                    <SwitchAccountLink next={auctionPath} /> to bid as another
                    business.
                  </>
                ) : null}
              </p>
            ) : !canBuyForOrganisation(active.role) ? (
              <p className="text-sm text-ink-muted">
                Only owners and admins can bid for this business.
              </p>
            ) : !acceptedTerms ? (
              <TermsRequiredNotice action="bid" />
            ) : (
              <BidForm listingId={listing.id} minimumBid={minBid} />
            )
          ) : listing.status === "PUBLISHED" && !started ? (
            <p className="text-sm text-ink-muted">
              Bidding has not started yet.
            </p>
          ) : listing.status === "PUBLISHED" && ended ? (
            <p className="text-sm text-ink-muted">
              This auction has ended. Closing uses server time and creates a
              simulated order if the reserve is met.
            </p>
          ) : listing.status === "UNSOLD" ? (
            <p className="text-sm text-ink-muted">
              Closed unsold. No bid met the reserve, or there were no bids.
            </p>
          ) : listing.status === "RESERVED" || listing.status === "SOLD" ? (
            <p className="text-sm text-ink-muted">
              Closed with a winning bid. Quota is reserved. If the seller is
              set up for payments, the winner pays FQX before compliance. FQX
              holds the funds until settlement.
              {order ? (
                <>
                  {" "}
                  <Link href={`/orders/${order.id}`} className="underline">
                    {order.status === "AWAITING_PAYMENT" &&
                    active &&
                    active.id === order.buyer_organisation_id &&
                    canBuyForOrganisation(active.role)
                      ? `Pay order ${order.id}`
                      : `View order ${order.id}`}
                  </Link>
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-sm text-ink-muted">
              This auction is not open for bids.
            </p>
          )
        }
        related={
          fishery ? (
            <ListingRelatedMarket
              fishery={fishery}
              currentListingId={listing.id}
              offering={listing.offering}
            />
          ) : null
        }
      >
        <OfferCard
          listing={listing}
          fishery={fishery ?? { name: listing.fishery_name, logo_path: null }}
          fisheryId={fishery?.id ?? null}
          sellerDisplay={sellerDisplay}
          priceLabel="Current bid"
          totalLabel="Indicative price"
          badge={
            ended
              ? listing.status === "PUBLISHED"
                ? "Ended — waiting to close"
                : listingStatusLabel(listing.status)
              : started
                ? listing.status === "PUBLISHED"
                  ? undefined
                  : listingStatusLabel(listing.status)
                : "Scheduled"
          }
          extraStats={[
            {
              label: "Starting price",
              value: formatAud(
                listing.starting_price_aud ?? listing.unit_price_aud,
              ),
            },
            {
              label: "Increment",
              value: formatAud(listing.bid_increment_aud ?? 0),
            },
            {
              label: "Reserve",
              value: listing.reserve_price_aud
                ? formatAud(listing.reserve_price_aud)
                : "None",
            },
          ]}
          metaLabel={ended ? "Ended" : started ? "Time left" : "Starts in"}
          metaValue={
            ended ? (
              formatTableDate(listing.expires_at)
            ) : (
              <AuctionCountdown
                at={
                  started
                    ? listing.expires_at
                    : (listing.starts_at ?? listing.expires_at)
                }
              />
            )
          }
        />
        {canClose ? (
          <form action={closeAuctionAction}>
            <input type="hidden" name="listing_id" value={listing.id} />
            <PendingSubmitButton
              className={buttonClassName}
              pendingLabel="Closing…"
            >
              Close auction
            </PendingSubmitButton>
          </form>
        ) : null}
        {canCancel ? (
          <form action={cancelListingAction}>
            <input type="hidden" name="listing_id" value={listing.id} />
            <input
              type="hidden"
              name="next"
              value={`/auctions/${listing.id}`}
            />
            <PendingSubmitButton
              className={buttonClassName}
              pendingLabel="Cancelling…"
            >
              Cancel auction
            </PendingSubmitButton>
          </form>
        ) : canManage &&
          (listing.status === "PENDING_APPROVAL" ||
            listing.status === "PUBLISHED") &&
          bids.length > 0 ? (
          <p className="text-sm text-ink-muted">
            This auction cannot be edited or cancelled because a bid has been
            placed.
          </p>
        ) : null}
        <section>
          <h2 className="text-xl font-semibold text-ink">Bids</h2>
          {bids.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No bids yet.</p>
          ) : (
            <div className={`mt-3 space-y-3 ${panelClassName}`}>
              {bids.map((bid) => (
                <div
                  key={bid.id}
                  className="border-b border-line pb-3 last:border-b-0 last:pb-0"
                >
                  <LabeledFields
                    items={[
                      { label: "Bid", value: formatAud(bid.amount_aud) },
                      {
                        label: "Bidder",
                        value: (
                          <PublicSellerName
                            display={
                              bidderDisplays[bid.id] ?? {
                                label: bid.bidder_name,
                                tooltip: null,
                              }
                            }
                          />
                        ),
                      },
                      {
                        label: "Time",
                        value: new Date(bid.created_at).toLocaleString("en-AU"),
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </OfferDetailLayout>
    </div>
  );
}
