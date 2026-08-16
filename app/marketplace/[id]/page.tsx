import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelListingAction } from "@/lib/listings/actions";
import { getListing } from "@/lib/listings/queries";
import { formatAud } from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getMyRole } from "@/lib/organisations/queries";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Listing",
};

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId)) {
    notFound();
  }

  const listing = await getListing(listingId);

  if (!listing) {
    notFound();
  }

  const user = await getUser();
  const role = user ? await getMyRole(listing.organisation_id) : null;
  const admin = user ? await isPlatformAdmin() : false;
  const canCancel =
    listing.status === "PENDING_APPROVAL" || listing.status === "PUBLISHED";
  const showCancel =
    canCancel && (admin || role === "OWNER" || role === "ADMIN");
  const expired = new Date(listing.expires_at) <= new Date();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm text-ink-muted">
        <Link href="/marketplace" className="underline">
          Marketplace
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
          <dt className="text-ink-muted">Price</dt>
          <dd className="text-ink">
            {formatAud(listing.unit_price_aud)} per {listing.unit_label}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Status</dt>
          <dd className="text-ink">
            {listing.status}
            {expired ? " · expired" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Expires</dt>
          <dd className="text-ink">
            {new Date(listing.expires_at).toLocaleString("en-AU")}
          </dd>
        </div>
      </dl>
      <p className="mt-8 text-sm text-ink-muted">
        Purchase is not available in this phase. This listing is view-only for
        buyers.
      </p>
      {showCancel ? (
        <form action={cancelListingAction} className="mt-6">
          <input type="hidden" name="listing_id" value={listing.id} />
          <input type="hidden" name="next" value={`/marketplace/${listing.id}`} />
          <button
            type="submit"
            className="border border-line px-4 py-2 text-sm text-ink hover:bg-paper-raised"
          >
            Cancel listing
          </button>
        </form>
      ) : null}
    </div>
  );
}
