import Link from "next/link";
import { FisheryLogo } from "@/components/fishery-logo";
import { cardClassName, LabeledFields } from "@/components/surface";
import {
  jurisdictionLabel,
  quantityTypeLabel,
  type Fishery,
  type Jurisdiction,
} from "@/lib/fisheries/types";
import { formatAudPerUnit } from "@/lib/listings/types";
import type { LatestSalePrice } from "@/lib/market/types";

export function FisheryCard({
  fishery,
  jurisdiction,
  lastSale,
  listingCounts,
}: {
  fishery: Fishery;
  jurisdiction?: Jurisdiction | null;
  lastSale?: LatestSalePrice;
  listingCounts?: { sale: number; lease: number };
}) {
  const unit = quantityTypeLabel(fishery.quantity_type);
  const counts = listingCounts ?? { sale: 0, lease: 0 };

  return (
    <Link
      href={`/fisheries/${fishery.id}`}
      className={`flex min-w-0 items-start gap-4 ${cardClassName}`}
    >
      <FisheryLogo fishery={fishery} size="md" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold tracking-tight text-ink text-lg sm:text-xl">
          {fishery.name}
        </p>
        <div className="mt-4">
          <LabeledFields
            items={[
              {
                label: "Jurisdiction",
                value: jurisdictionLabel(jurisdiction),
              },
              {
                label: "Last sale",
                value: lastSale
                  ? formatAudPerUnit(lastSale.unit_price_aud, unit)
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
}
