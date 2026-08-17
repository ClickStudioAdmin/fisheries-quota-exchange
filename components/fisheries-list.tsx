"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FisheryLogo } from "@/components/fishery-logo";
import { cardClassName, LabeledFields } from "@/components/surface";
import {
  quantityTypeLabel,
  type Fishery,
  type Jurisdiction,
} from "@/lib/fisheries/types";
import { formatAud } from "@/lib/listings/types";
import type { LatestSalePrice } from "@/lib/market/types";

const filterFieldClassName =
  "border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea";

function jurisdictionLabel(jurisdiction: Jurisdiction | undefined) {
  return jurisdiction
    ? `${jurisdiction.code} — ${jurisdiction.name}`
    : "Jurisdiction";
}

export function FisheriesList({
  fisheries,
  jurisdictions,
  prices,
}: {
  fisheries: Fishery[];
  jurisdictions: Jurisdiction[];
  prices: LatestSalePrice[];
}) {
  const [jurisdictionId, setJurisdictionId] = useState("ALL");
  const lastSale = useMemo(
    () => new Map(prices.map((price) => [price.fishery_id, price])),
    [prices],
  );
  const visible = useMemo(
    () =>
      fisheries.filter((fishery) => {
        if (jurisdictionId === "ALL") {
          return true;
        }
        return String(fishery.jurisdiction_id) === jurisdictionId;
      }),
    [fisheries, jurisdictionId],
  );

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
      </div>
      {visible.length === 0 ? (
        <p className="text-ink-muted">No fisheries match these filters.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((fishery) => {
            const jurisdiction = jurisdictions.find(
              (item) => item.id === fishery.jurisdiction_id,
            );
            const sale = lastSale.get(fishery.id);
            const unit = quantityTypeLabel(fishery.quantity_type);

            return (
              <Link
                key={fishery.id}
                href={`/fisheries/${fishery.id}`}
                className={`flex items-start gap-4 ${cardClassName}`}
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
                          label: "Unit",
                          value: unit,
                        },
                        {
                          label: "Last sale",
                          value: sale
                            ? `${formatAud(sale.unit_price_aud)} / ${unit}`
                            : "No sales yet",
                        },
                        ...(fishery.code
                          ? [{ label: "Code", value: fishery.code }]
                          : []),
                      ]}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
