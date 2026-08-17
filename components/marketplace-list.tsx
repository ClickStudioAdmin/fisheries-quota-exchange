"use client";

import { useEffect, useMemo, useState } from "react";
import { tableSecondaryButtonClassName } from "@/components/auth-card";
import { ListingCards } from "@/components/listing-card";
import type { Fishery, Jurisdiction } from "@/lib/fisheries/types";
import {
  listingOfferingLabel,
  listingTypeLabel,
  type Listing,
  type ListingOffering,
  type ListingType,
} from "@/lib/listings/types";

const PAGE_SIZE = 20;

const filterFieldClassName =
  "border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea";

type SortOption = "PRICE_ASC" | "PRICE_DESC" | "QUANTITY_ASC" | "QUANTITY_DESC";

function jurisdictionLabel(jurisdiction: Jurisdiction) {
  return `${jurisdiction.code} — ${jurisdiction.name}`;
}

function listingPrice(listing: Listing) {
  const price = Number(listing.unit_price_aud);
  return Number.isFinite(price) ? price : 0;
}

function listingQuantity(listing: Listing) {
  const quantity = Number(listing.quantity);
  return Number.isFinite(quantity) ? quantity : 0;
}

export function MarketplaceList({
  listings,
  fisheries,
  jurisdictions,
}: {
  listings: Listing[];
  fisheries: Fishery[];
  jurisdictions: Jurisdiction[];
}) {
  const [listingType, setListingType] = useState<"ALL" | ListingType>("ALL");
  const [offering, setOffering] = useState<"ALL" | ListingOffering>("ALL");
  const [jurisdictionId, setJurisdictionId] = useState("ALL");
  const [fishery, setFishery] = useState("ALL");
  const [sort, setSort] = useState<SortOption>("PRICE_ASC");
  const [page, setPage] = useState(1);
  const fisheriesByName = useMemo(
    () => new Map(fisheries.map((item) => [item.name, item])),
    [fisheries],
  );
  const fisheryIds = useMemo(
    () => new Map(fisheries.map((item) => [item.name, item.id])),
    [fisheries],
  );

  const fisheryNames = useMemo(() => {
    const names = [
      ...new Set(
        listings
          .map((listing) => listing.fishery_name)
          .filter((name) => {
            if (name.trim() === "") {
              return false;
            }
            if (jurisdictionId === "ALL") {
              return true;
            }
            return (
              String(fisheriesByName.get(name)?.jurisdiction_id) ===
              jurisdictionId
            );
          }),
      ),
    ];
    return names.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  }, [fisheriesByName, jurisdictionId, listings]);

  const visible = useMemo(() => {
    const filtered = listings.filter((listing) => {
      if (listingType !== "ALL" && listing.listing_type !== listingType) {
        return false;
      }
      if (offering !== "ALL" && listing.offering !== offering) {
        return false;
      }
      if (fishery !== "ALL" && listing.fishery_name !== fishery) {
        return false;
      }
      if (jurisdictionId !== "ALL") {
        const listingFishery = fisheriesByName.get(listing.fishery_name);
        if (String(listingFishery?.jurisdiction_id) !== jurisdictionId) {
          return false;
        }
      }
      return true;
    });
    const direction = sort.endsWith("_ASC") ? 1 : -1;
    const value =
      sort.startsWith("QUANTITY") ? listingQuantity : listingPrice;
    return [...filtered].sort(
      (a, b) => direction * (value(a) - value(b)),
    );
  }, [
    fisheriesByName,
    fishery,
    jurisdictionId,
    listingType,
    listings,
    offering,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = visible.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const from = visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, visible.length);

  useEffect(() => {
    setPage(1);
  }, [fishery, jurisdictionId, listingType, offering, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="whitespace-nowrap">Jurisdiction</span>
          <select
            value={jurisdictionId}
            onChange={(event) => {
              const next = event.target.value;
              setJurisdictionId(next);
              if (fishery === "ALL" || next === "ALL") {
                return;
              }
              if (
                String(fisheriesByName.get(fishery)?.jurisdiction_id) !== next
              ) {
                setFishery("ALL");
              }
            }}
            className={filterFieldClassName}
          >
            <option value="ALL">All</option>
            {jurisdictions.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {jurisdictionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="whitespace-nowrap">Fishery</span>
          <select
            value={fishery}
            onChange={(event) => setFishery(event.target.value)}
            className={filterFieldClassName}
          >
            <option value="ALL">All</option>
            {fisheryNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="whitespace-nowrap">Listing type</span>
          <select
            value={listingType}
            onChange={(event) =>
              setListingType(event.target.value as "ALL" | ListingType)
            }
            className={filterFieldClassName}
          >
            <option value="ALL">All</option>
            <option value="FIXED_PRICE">
              {listingTypeLabel("FIXED_PRICE")}
            </option>
            <option value="AUCTION">{listingTypeLabel("AUCTION")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="whitespace-nowrap">Type</span>
          <select
            value={offering}
            onChange={(event) =>
              setOffering(event.target.value as "ALL" | ListingOffering)
            }
            className={filterFieldClassName}
          >
            <option value="ALL">All</option>
            <option value="SALE">{listingOfferingLabel("SALE")}</option>
            <option value="LEASE">{listingOfferingLabel("LEASE")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="whitespace-nowrap">Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className={filterFieldClassName}
          >
            <option value="PRICE_ASC">Price (Low to High)</option>
            <option value="PRICE_DESC">Price (High to Low)</option>
            <option value="QUANTITY_ASC">Quantity (Low to High)</option>
            <option value="QUANTITY_DESC">Quantity (High to Low)</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-ink-muted">
        {visible.length === 0
          ? "0 listings"
          : `Showing ${from}–${to} of ${visible.length} listings`}
      </p>
      <ListingCards
        listings={paged}
        empty="No listings match these filters."
        fisheryIds={fisheryIds}
      />
      {pageCount > 1 ? (
        <nav
          aria-label="Marketplace pages"
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            className={tableSecondaryButtonClassName}
          >
            Previous
          </button>
          <p className="text-sm text-ink-muted">
            Page {currentPage} of {pageCount}
          </p>
          <button
            type="button"
            disabled={currentPage >= pageCount}
            onClick={() => setPage(currentPage + 1)}
            className={tableSecondaryButtonClassName}
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
