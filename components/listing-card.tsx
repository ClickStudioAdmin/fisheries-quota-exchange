"use client";

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatAud,
  listingOfferingLabel,
  listingTypeLabel,
  type Listing,
  type ListingType,
} from "@/lib/listings/types";
import { AuctionCard } from "@/components/auction-card";

type ListingCardProps = {
  listing: Listing;
};

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="block border border-line p-4 hover:bg-paper-raised"
    >
      <p className="font-medium text-ink">
        {listing.fishery_name} · {listing.stock_name}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {listingTypeLabel(listing.listing_type)} ·{" "}
        {listingOfferingLabel(listing.offering)} · {listing.quantity}{" "}
        {listing.unit_label} · {formatAud(listing.unit_price_aud)} /{" "}
        {listing.unit_label}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {listing.seller_name} · {listing.season_name}
      </p>
    </Link>
  );
}

export function MarketplaceListingCard({ listing }: ListingCardProps) {
  if (listing.listing_type === "AUCTION") {
    return <AuctionCard listing={listing} />;
  }

  return <ListingCard listing={listing} />;
}

export function ListingCards({
  listings,
  empty,
}: {
  listings: Listing[];
  empty: string;
}) {
  if (listings.length === 0) {
    return <p className="text-sm text-ink-muted">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <MarketplaceListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

export function FisheryOfferingSection({
  title,
  listings,
}: {
  title: "Sales" | "Leases";
  listings: Listing[];
}) {
  const [listingType, setListingType] = useState<"ALL" | ListingType>("ALL");
  const kind = title === "Sales" ? "sale" : "lease";
  const visible = useMemo(
    () =>
      listings.filter((listing) => {
        if (listingType === "ALL") {
          return true;
        }
        return listing.listing_type === listingType;
      }),
    [listings, listingType],
  );
  const empty =
    listingType === "AUCTION"
      ? `No ${kind} auctions at the moment.`
      : listingType === "FIXED_PRICE"
        ? `No fixed-price ${kind}s at the moment.`
        : `No ${kind}s at the moment.`;

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="whitespace-nowrap">Listing type</span>
          <select
            value={listingType}
            onChange={(event) =>
              setListingType(event.target.value as "ALL" | ListingType)
            }
            className="border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea"
          >
            <option value="ALL">All</option>
            <option value="FIXED_PRICE">
              {listingTypeLabel("FIXED_PRICE")}
            </option>
            <option value="AUCTION">{listingTypeLabel("AUCTION")}</option>
          </select>
        </label>
      </div>
      <div className="mt-4">
        <ListingCards listings={visible} empty={empty} />
      </div>
    </section>
  );
}

export function FisheryOfferings({ listings }: { listings: Listing[] }) {
  return (
    <div className="mt-12 grid items-start gap-10 md:grid-cols-2">
      <FisheryOfferingSection
        title="Sales"
        listings={listings.filter((listing) => listing.offering === "SALE")}
      />
      <FisheryOfferingSection
        title="Leases"
        listings={listings.filter((listing) => listing.offering === "LEASE")}
      />
    </div>
  );
}
