"use client";

import { useEffect, useMemo, useState } from "react";
import { AuctionCard } from "@/components/auction-card";
import {
  ListPager,
  listRangeLabel,
  paginateItems,
  useListPagination,
} from "@/components/list-pager";
import { OfferCard } from "@/components/offer-card";
import type { Fishery } from "@/lib/fisheries/types";
import { formatTableDateTime } from "@/lib/format";
import {
  listingTypeLabel,
  type Listing,
  type ListingType,
} from "@/lib/listings/types";

type ListingCardProps = {
  listing: Listing;
  hideFishery?: boolean;
  hideOffering?: boolean;
  fisheryId?: number | null;
  fishery?: Pick<Fishery, "name" | "logo_path"> | null;
};

export function ListingCard({
  listing,
  hideFishery,
  hideOffering,
  fisheryId,
  fishery,
}: ListingCardProps) {
  return (
    <OfferCard
      listing={listing}
      href={`/marketplace/${listing.id}`}
      hideFishery={hideFishery}
      hideOffering={hideOffering}
      fisheryId={fisheryId}
      fishery={fishery}
      extraFields={[
        { label: "Expires", value: formatTableDateTime(listing.expires_at) },
      ]}
    />
  );
}

export function MarketplaceListingCard({
  listing,
  hideFishery,
  hideOffering,
  fisheryId,
  fishery,
}: ListingCardProps) {
  if (listing.listing_type === "AUCTION") {
    return (
      <AuctionCard
        listing={listing}
        hideFishery={hideFishery}
        hideOffering={hideOffering}
        fisheryId={fisheryId}
        fishery={fishery}
      />
    );
  }

  return (
    <ListingCard
      listing={listing}
      hideFishery={hideFishery}
      hideOffering={hideOffering}
      fisheryId={fisheryId}
      fishery={fishery}
    />
  );
}

export function ListingCards({
  listings,
  empty,
  hideFishery,
  hideOffering,
  fisheriesByName,
}: {
  listings: Listing[];
  empty: string;
  hideFishery?: boolean;
  hideOffering?: boolean;
  fisheriesByName?: Map<string, Pick<Fishery, "id" | "name" | "logo_path">>;
}) {
  if (listings.length === 0) {
    return <p className="text-sm text-ink-muted">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => {
        const fishery = fisheriesByName?.get(listing.fishery_name) ?? null;

        return (
          <MarketplaceListingCard
            key={listing.id}
            listing={listing}
            hideFishery={hideFishery}
            hideOffering={hideOffering}
            fisheryId={fishery?.id ?? null}
            fishery={fishery}
          />
        );
      })}
    </div>
  );
}

export function FisheryOfferingSection({
  title,
  kind,
  listings,
}: {
  title: string;
  kind: "sale" | "lease";
  listings: Listing[];
}) {
  const [listingType, setListingType] = useState<"ALL" | ListingType>("ALL");
  const { page, setPage, pageSize, setPageSize } = useListPagination();
  const rangeLabel = kind === "sale" ? "sales" : "leases";
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
  const { pageCount, currentPage, from, to, paged } = paginateItems(
    visible,
    page,
    pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [listingType]);
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
      <div className="mt-4 space-y-4">
        {visible.length > 0 ? (
          <p className="text-xs text-ink-muted">
            {listRangeLabel(from, to, visible.length, rangeLabel)}
          </p>
        ) : null}
        <ListingCards
          listings={paged}
          empty={empty}
          hideFishery
          hideOffering
        />
        <ListPager
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          label={`${title} pages`}
          itemCount={visible.length}
        />
      </div>
    </section>
  );
}

export function FisheryOfferings({ listings }: { listings: Listing[] }) {
  return (
    <div className="mt-12 grid min-w-0 items-start gap-10 md:grid-cols-2">
      <FisheryOfferingSection
        title="Current Sale Listings"
        kind="sale"
        listings={listings.filter((listing) => listing.offering === "SALE")}
      />
      <FisheryOfferingSection
        title="Current Lease Listings"
        kind="lease"
        listings={listings.filter((listing) => listing.offering === "LEASE")}
      />
    </div>
  );
}
