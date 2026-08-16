import Link from "next/link";
import { notFound } from "next/navigation";
import { BidForm } from "@/components/bid-form";
import { closeAuctionAction } from "@/lib/auctions/actions";
import { ensureAuctionClosed, listBids } from "@/lib/auctions/queries";
import {
  auctionHasEnded,
  auctionHasStarted,
  auctionIsLive,
  minimumBid,
} from "@/lib/auctions/types";
import { cancelListingAction } from "@/lib/listings/actions";
import { getListing } from "@/lib/listings/queries";
import { formatAud } from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { listMyOrganisations, getMyRole } from "@/lib/organisations/queries";
import { getOrderForListing } from "@/lib/orders/queries";
import { getUser } from "@/lib/supabase/server";
import { buttonClassName } from "@/components/auth-card";

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
  const [bids, order] = await Promise.all([
    listBids(listing.id),
    getOrderForListing(listing.id),
  ]);
  const user = await getUser();
  const role = user ? await getMyRole(listing.organisation_id) : null;
  const admin = user ? await isPlatformAdmin() : false;
  const organisations = user ? await listMyOrganisations() : [];
  const bidderOrganisations = organisations.filter(
    (organisation) => organisation.id !== listing.organisation_id,
  );
  const ended = auctionHasEnded(listing);
  const started = auctionHasStarted(listing);
  const live = auctionIsLive(listing);
  const canCancel =
    (listing.status === "PENDING_APPROVAL" || listing.status === "PUBLISHED") &&
    (admin || ((role === "OWNER" || role === "ADMIN") && bids.length === 0));
  const canClose =
    listing.status === "PUBLISHED" && ended && Boolean(user);
  const minBid = minimumBid(listing, bids.length);
  const isSeller = role !== null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm text-ink-muted">
        <Link href="/auctions" className="underline">
          Auctions
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        {listing.fishery_name}
      </h1>
      <p className="mt-2 text-ink-muted">
        {listing.stock_name} · {listing.season_name} · {listing.quota_type_name}{" "}
        ({listing.measurement_kind})
      </p>
      <dl className="mt-8 grid max-w-lg gap-3 text-sm">
        <div>
          <dt className="text-ink-muted">Seller</dt>
          <dd className="text-ink">{listing.seller_name}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Offering</dt>
          <dd className="text-ink">{listing.offering}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Quantity</dt>
          <dd className="text-ink">
            {listing.quantity} {listing.unit_label}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Current price</dt>
          <dd className="text-ink">
            {formatAud(listing.unit_price_aud)} per {listing.unit_label}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Starting price</dt>
          <dd className="text-ink">
            {formatAud(listing.starting_price_aud ?? listing.unit_price_aud)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Increment</dt>
          <dd className="text-ink">
            {formatAud(listing.bid_increment_aud ?? 0)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Reserve</dt>
          <dd className="text-ink">
            {listing.reserve_price_aud
              ? formatAud(listing.reserve_price_aud)
              : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Status</dt>
          <dd className="text-ink">{listing.status}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Starts</dt>
          <dd className="text-ink">
            {listing.starts_at
              ? new Date(listing.starts_at).toLocaleString("en-AU")
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Ends</dt>
          <dd className="text-ink">
            {new Date(listing.expires_at).toLocaleString("en-AU")}
          </dd>
        </div>
      </dl>
      {listing.status === "PUBLISHED" && live ? (
        <div className="mt-8">
          {!user ? (
            <p className="text-sm text-ink-muted">
              <Link
                href={`/login?next=/auctions/${listing.id}`}
                className="underline"
              >
                Sign in
              </Link>{" "}
              to bid. Bid time is recorded by the server.
            </p>
          ) : organisations.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Create an organisation from the dashboard before bidding.
            </p>
          ) : isSeller && bidderOrganisations.length === 0 ? (
            <p className="text-sm text-ink-muted">
              You cannot bid on your organisation&apos;s auction. Use a
              different organisation to test a bid.
            </p>
          ) : bidderOrganisations.length > 0 ? (
            <BidForm
              listingId={listing.id}
              minimumBid={minBid}
              organisations={bidderOrganisations}
            />
          ) : null}
        </div>
      ) : listing.status === "PUBLISHED" && !started ? (
        <p className="mt-8 text-sm text-ink-muted">
          Bidding has not started yet.
        </p>
      ) : listing.status === "PUBLISHED" && ended ? (
        <p className="mt-8 text-sm text-ink-muted">
          This auction has ended. Closing uses server time and creates a
          simulated order if the reserve is met.
        </p>
      ) : listing.status === "UNSOLD" ? (
        <p className="mt-8 text-sm text-ink-muted">
          Closed unsold. No bid met the reserve, or there were no bids.
        </p>
      ) : listing.status === "RESERVED" || listing.status === "SOLD" ? (
        <p className="mt-8 text-sm text-ink-muted">
          Closed with a winning bid. Quota is reserved and the order follows
          the Phase 7 compliance workflow.
          {order ? (
            <>
              {" "}
              <Link href={`/orders/${order.id}`} className="underline">
                View order {order.id}
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-8 text-sm text-ink-muted">
          This auction is not open for bids.
        </p>
      )}
      {canClose ? (
        <form action={closeAuctionAction} className="mt-6">
          <input type="hidden" name="listing_id" value={listing.id} />
          <button type="submit" className={buttonClassName}>
            Close auction
          </button>
        </form>
      ) : null}
      {canCancel ? (
        <form action={cancelListingAction} className="mt-6">
          <input type="hidden" name="listing_id" value={listing.id} />
          <input type="hidden" name="next" value={`/auctions/${listing.id}`} />
          <button
            type="submit"
            className="border border-line px-4 py-2 text-sm text-ink hover:bg-paper-raised"
          >
            Cancel auction
          </button>
        </form>
      ) : null}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">Bids</h2>
        {bids.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No bids yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            {bids.map((bid) => (
              <li key={bid.id}>
                {formatAud(bid.amount_aud)} · {bid.bidder_name} ·{" "}
                {new Date(bid.created_at).toLocaleString("en-AU")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
