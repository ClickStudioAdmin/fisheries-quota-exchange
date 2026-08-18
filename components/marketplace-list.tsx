"use client";

import { useEffect, useMemo, useState } from "react";
import { ListingCards } from "@/components/listing-card";
import {
  ListPager,
  listRangeLabel,
  paginateItems,
  useListPagination,
} from "@/components/list-pager";
import { jurisdictionLabel, type Fishery, type Jurisdiction } from "@/lib/fisheries/types";
import {
  listingOfferingLabel,
  listingTypeLabel,
  type Listing,
  type ListingOffering,
  type ListingType,
} from "@/lib/listings/types";

const filterFieldClassName =
  "w-full min-w-0 border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea";

const filterLabelClassName =
  "flex min-w-[9rem] flex-1 flex-col gap-1 text-sm text-ink-muted";

type SortOption = "PRICE_ASC" | "PRICE_DESC" | "QUANTITY_ASC" | "QUANTITY_DESC";

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
  const { page, setPage, pageSize, setPageSize } = useListPagination();
  const fisheriesByName = useMemo(
    () => new Map(fisheries.map((item) => [item.name, item])),
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

  const { pageCount, currentPage, from, to, paged } = paginateItems(
    visible,
    page,
    pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [fishery, jurisdictionId, listingType, offering, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-1">
        <label className={filterLabelClassName}>
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
        <label className={`${filterLabelClassName} min-w-[12rem] flex-[1.4]`}>
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
        <label className={filterLabelClassName}>
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
        <label className={filterLabelClassName}>
          <span className="whitespace-nowrap">Offering</span>
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
        <label className={`${filterLabelClassName} min-w-[11rem]`}>
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
        {listRangeLabel(from, to, visible.length, "listings")}
      </p>
      <ListingCards
        listings={paged}
        empty="No listings match these filters."
        fisheriesByName={fisheriesByName}
      />
      <ListPager
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        label="Marketplace pages"
        itemCount={visible.length}
      />
    </div>
  );
}
