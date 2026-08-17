import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import { quantityTypeLabel } from "@/lib/fisheries/types";
import { formatAud } from "@/lib/listings/types";
import {
  latestSalePriceMap,
  listLatestSalePrices,
} from "@/lib/market/queries";

export const metadata: Metadata = {
  title: "Fisheries",
};

export default async function FisheriesPage() {
  const [fisheries, jurisdictions, prices] = await Promise.all([
    listFisheries(),
    listJurisdictions(),
    listLatestSalePrices(),
  ]);
  const lastSale = latestSalePriceMap(prices);

  return (
    <>
      <PageIntro title="Fisheries">
        <p>
          Open a fishery for current listings, auctions, and recent sale prices.
        </p>
      </PageIntro>
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {fisheries.length === 0 ? (
          <p className="text-ink-muted">No fisheries have been created yet.</p>
        ) : (
          <div className="space-y-3">
            {fisheries.map((fishery) => {
              const jurisdiction = jurisdictions.find(
                (item) => item.id === fishery.jurisdiction_id,
              );
              const sale = lastSale.get(fishery.id);
              const unit = quantityTypeLabel(fishery.quantity_type);

              return (
                <Link
                  key={fishery.id}
                  href={`/fisheries/${fishery.id}`}
                  className="block border border-line p-4 hover:bg-paper-raised"
                >
                  <p className="font-medium text-ink">{fishery.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {jurisdiction
                      ? `${jurisdiction.code} — ${jurisdiction.name}`
                      : "Jurisdiction"}
                    {fishery.code ? ` · ${fishery.code}` : ""} · {unit}
                    {sale
                      ? ` · last sale ${formatAud(sale.unit_price_aud)} / ${unit}`
                      : " · no sales yet"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
