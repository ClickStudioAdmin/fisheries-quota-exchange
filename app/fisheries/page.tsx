import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { listFisheries } from "@/lib/fisheries/queries";

export const metadata: Metadata = {
  title: "Fisheries",
};

export default async function FisheriesPage() {
  const fisheries = await listFisheries();

  return (
    <PageIntro title="Fisheries">
      <p>
        These are reference fisheries. Trading happens on Marketplace and
        Auctions.
      </p>
      {fisheries.length === 0 ? (
        <p>No fisheries have been created yet.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {fisheries.map((fishery) => (
            <li key={fishery.id}>
              {fishery.name}
              {fishery.code ? ` (${fishery.code})` : ""}
            </li>
          ))}
        </ul>
      )}
    </PageIntro>
  );
}
