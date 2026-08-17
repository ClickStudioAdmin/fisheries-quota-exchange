import type { Metadata } from "next";
import { FisheriesList } from "@/components/fisheries-list";
import { PageIntro } from "@/components/page-intro";
import { pageWidthClassName } from "@/components/surface";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import { listLatestSalePrices } from "@/lib/market/queries";

export const metadata: Metadata = {
  title: "Fisheries",
};

export default async function FisheriesPage() {
  const [fisheries, jurisdictions, prices] = await Promise.all([
    listFisheries(),
    listJurisdictions(),
    listLatestSalePrices(),
  ]);

  return (
    <>
      <PageIntro title="Fisheries">
        <p>
          Open a fishery for current listings, auctions, and recent sale prices.
        </p>
      </PageIntro>
      <div className={`${pageWidthClassName} pb-16`}>
        {fisheries.length === 0 ? (
          <p className="text-ink-muted">No fisheries have been created yet.</p>
        ) : (
          <FisheriesList
            fisheries={fisheries}
            jurisdictions={jurisdictions}
            prices={prices}
          />
        )}
      </div>
    </>
  );
}
