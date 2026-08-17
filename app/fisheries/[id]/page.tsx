import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuctionCard } from "@/components/auction-card";
import { ListingCard } from "@/components/listing-card";
import { PriceChart } from "@/components/price-chart";
import { getFishery, listJurisdictions } from "@/lib/fisheries/queries";
import { quantityTypeLabel } from "@/lib/fisheries/types";
import { formatTableDate } from "@/lib/format";
import { formatAud } from "@/lib/listings/types";
import {
  listMarketSales,
  listOpenListingsForFishery,
} from "@/lib/market/queries";

type FisheryPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: FisheryPageProps): Promise<Metadata> {
  const { id } = await params;
  const fisheryId = Number(id);
  if (!Number.isInteger(fisheryId)) {
    return { title: "Fishery" };
  }

  const fishery = await getFishery(fisheryId);
  return { title: fishery?.name ?? "Fishery" };
}

export default async function FisheryPage({ params }: FisheryPageProps) {
  const { id } = await params;
  const fisheryId = Number(id);

  if (!Number.isInteger(fisheryId)) {
    notFound();
  }

  const fishery = await getFishery(fisheryId);

  if (!fishery) {
    notFound();
  }

  const [jurisdictions, offers, sales] = await Promise.all([
    listJurisdictions(),
    listOpenListingsForFishery(fishery.id),
    listMarketSales(fishery.id),
  ]);

  const jurisdiction = jurisdictions.find(
    (item) => item.id === fishery.jurisdiction_id,
  );
  const unit = quantityTypeLabel(fishery.quantity_type);
  const listings = offers.filter((item) => item.listing_type === "FIXED_PRICE");
  const auctions = offers.filter((item) => item.listing_type === "AUCTION");
  const lastSale = sales[sales.length - 1];
  const volume = sales.reduce((sum, sale) => sum + Number(sale.quantity), 0);
  const average =
    sales.length === 0
      ? null
      : sales.reduce((sum, sale) => sum + Number(sale.unit_price_aud), 0) /
        sales.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm text-ink-muted">
        <Link href="/fisheries" className="underline">
          Fisheries
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        {fishery.name}
      </h1>
      <p className="mt-2 text-ink-muted">
        {jurisdiction
          ? `${jurisdiction.code} — ${jurisdiction.name}`
          : "Jurisdiction"}
        {fishery.code ? ` · ${fishery.code}` : ""} · quantity in {unit}
      </p>

      <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
        <div className="border border-line p-4">
          <dt className="text-ink-muted">Last sale</dt>
          <dd className="mt-1 text-ink">
            {lastSale
              ? `${formatAud(lastSale.unit_price_aud)} / ${unit}`
              : "—"}
          </dd>
          {lastSale ? (
            <dd className="mt-1 text-ink-muted">
              {formatTableDate(lastSale.created_at)}
            </dd>
          ) : null}
        </div>
        <div className="border border-line p-4">
          <dt className="text-ink-muted">Average sale</dt>
          <dd className="mt-1 text-ink">
            {average != null ? `${formatAud(average)} / ${unit}` : "—"}
          </dd>
        </div>
        <div className="border border-line p-4">
          <dt className="text-ink-muted">Volume traded</dt>
          <dd className="mt-1 text-ink">
            {sales.length === 0
              ? "—"
              : `${volume} ${unit} · ${sales.length} ${
                  sales.length === 1 ? "sale" : "sales"
                }`}
          </dd>
        </div>
      </dl>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">Sale prices</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Completed and in-progress sales. Leases are not included.
        </p>
        <div className="mt-4">
          <PriceChart
            points={sales
              .map((sale) => ({
                at: sale.created_at,
                price: Number(sale.unit_price_aud),
              }))
              .filter((point) => Number.isFinite(point.price))}
            unitLabel={unit}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">Current listings</h2>
        <div className="mt-4 space-y-3">
          {listings.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No published listings at the moment.
            </p>
          ) : (
            listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">Current auctions</h2>
        <div className="mt-4 space-y-3">
          {auctions.length === 0 ? (
            <p className="text-sm text-ink-muted">No auctions at the moment.</p>
          ) : (
            auctions.map((listing) => (
              <AuctionCard key={listing.id} listing={listing} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
