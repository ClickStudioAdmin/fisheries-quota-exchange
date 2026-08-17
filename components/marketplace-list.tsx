"use client";

import { useMemo, useState } from "react";
import { ListingCards } from "@/components/listing-card";
import {
  listingOfferingLabel,
  listingTypeLabel,
  type Listing,
  type ListingOffering,
  type ListingType,
} from "@/lib/listings/types";

const filterFieldClassName =
  "border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea";

export function MarketplaceList({ listings }: { listings: Listing[] }) {
  const [listingType, setListingType] = useState<"ALL" | ListingType>("ALL");
  const [offering, setOffering] = useState<"ALL" | ListingOffering>("ALL");

  const visible = useMemo(
    () =>
      listings.filter((listing) => {
        if (listingType !== "ALL" && listing.listing_type !== listingType) {
          return false;
        }
        if (offering !== "ALL" && listing.offering !== offering) {
          return false;
        }
        return true;
      }),
    [listings, listingType, offering],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
      </div>
      <ListingCards
        listings={visible}
        empty="No listings match these filters."
      />
    </div>
  );
}
