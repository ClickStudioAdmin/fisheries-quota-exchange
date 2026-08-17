"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { FisheryLogo } from "@/components/fishery-logo";
import {
  ListPager,
  listRangeLabel,
  paginateItems,
} from "@/components/list-pager";
import { cardClassName, LabeledFields } from "@/components/surface";
import {
  jurisdictionLabel,
  quantityTypeLabel,
  type Fishery,
  type Jurisdiction,
} from "@/lib/fisheries/types";
import { formatAud } from "@/lib/listings/types";
import type { LatestSalePrice } from "@/lib/market/types";

const filterFieldClassName =
  "border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea";

export function FisheriesList({
  fisheries,
  jurisdictions,
  prices,
  listingCounts,
}: {
  fisheries: Fishery[];
  jurisdictions: Jurisdiction[];
  prices: LatestSalePrice[];
  listingCounts: Record<string, { sale: number; lease: number }>;
}) {
  const [jurisdictionId, setJurisdictionId] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const searchId = useId();
  const lastSale = useMemo(
    () => new Map(prices.map((price) => [price.fishery_id, price])),
    [prices],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return fisheries.filter((fishery) => {
      if (jurisdictionId !== "ALL" && String(fishery.jurisdiction_id) !== jurisdictionId) {
        return false;
      }
      if (needle && !fishery.name.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  }, [fisheries, jurisdictionId, query]);

  const { pageCount, currentPage, from, to, paged } = paginateItems(
    visible,
    page,
  );

  useEffect(() => {
    setPage(1);
  }, [jurisdictionId, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="whitespace-nowrap">Jurisdiction</span>
          <select
            value={jurisdictionId}
            onChange={(event) => setJurisdictionId(event.target.value)}
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
        <label className="sr-only" htmlFor={searchId}>
          Search fisheries
        </label>
        <input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search fishery name…"
          className={`${filterFieldClassName} w-full sm:max-w-xs`}
        />
      </div>
      {visible.length === 0 ? (
        <p className="text-ink-muted">No fisheries match these filters.</p>
      ) : (
        <>
          <p className="text-xs text-ink-muted">
            {listRangeLabel(from, to, visible.length, "fisheries")}
          </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {paged.map((fishery) => {
            const jurisdiction = jurisdictions.find(
              (item) => item.id === fishery.jurisdiction_id,
            );
            const sale = lastSale.get(fishery.id);
            const unit = quantityTypeLabel(fishery.quantity_type);
            const counts = listingCounts[fishery.name] ?? { sale: 0, lease: 0 };

            return (
              <Link
                key={fishery.id}
                href={`/fisheries/${fishery.id}`}
                className={`flex min-w-0 items-start gap-4 ${cardClassName}`}
              >
                <FisheryLogo fishery={fishery} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{fishery.name}</p>
                  <div className="mt-4">
                    <LabeledFields
                      items={[
                        {
                          label: "Jurisdiction",
                          value: jurisdictionLabel(jurisdiction),
                        },
                        {
                          label: "Last sale",
                          value: sale
                            ? `${formatAud(sale.unit_price_aud)} / ${unit}`
                            : "No sales yet",
                        },
                        {
                          label: "Sale listings",
                          value: String(counts.sale),
                        },
                        {
                          label: "Lease listings",
                          value: String(counts.lease),
                        },
                      ]}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
          <ListPager
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            label="Fisheries pages"
          />
        </>
      )}
    </div>
  );
}
