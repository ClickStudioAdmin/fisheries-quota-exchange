import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FisheryOfferings } from "@/components/listing-card";
import { FisheryLogo } from "@/components/fishery-logo";
import { PriceChart } from "@/components/price-chart";
import { getFishery, listJurisdictions } from "@/lib/fisheries/queries";
import { quantityTypeLabel } from "@/lib/fisheries/types";
import { formatTableDate } from "@/lib/format";
import { formatAud } from "@/lib/listings/types";
import {
  listMarketSales,
  listOpenListingsForFishery,
} from "@/lib/market/queries";
import type { MarketSale } from "@/lib/market/types";

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

  const [jurisdictions, offers, trades] = await Promise.all([
    listJurisdictions(),
    listOpenListingsForFishery(fishery.id),
    listMarketSales(fishery.id),
  ]);

  const jurisdiction = jurisdictions.find(
    (item) => item.id === fishery.jurisdiction_id,
  );
  const unit = quantityTypeLabel(fishery.quantity_type);
  const sales = trades.filter((trade) => trade.offering === "SALE");
  const leases = trades.filter((trade) => trade.offering === "LEASE");
  const lastSale = sales[sales.length - 1];
  const lastLease = leases[leases.length - 1];
  const volume = sales.reduce(
    (sum: number, sale: MarketSale) => sum + Number(sale.quantity),
    0,
  );
  const average =
    sales.length === 0
      ? null
      : sales.reduce(
          (sum: number, sale: MarketSale) => sum + Number(sale.unit_price_aud),
          0,
        ) / sales.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm text-ink-muted">
        <Link href="/fisheries" className="underline">
          Fisheries
        </Link>
      </p>
      <div className="mt-4 flex items-center gap-4">
        <FisheryLogo fishery={fishery} size="lg" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            {fishery.name}
          </h1>
          <p className="mt-2 text-ink-muted">
            {jurisdiction
              ? `${jurisdiction.code} — ${jurisdiction.name}`
              : "Jurisdiction"}
            {fishery.code ? ` · ${fishery.code}` : ""} · quantity in {unit}
          </p>
        </div>
      </div>

      <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
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
          <dt className="text-ink-muted">Last lease</dt>
          <dd className="mt-1 text-ink">
            {lastLease
              ? `${formatAud(lastLease.unit_price_aud)} / ${unit}`
              : "—"}
          </dd>
          {lastLease ? (
            <dd className="mt-1 text-ink-muted">
              {formatTableDate(lastLease.created_at)}
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

      <FisheryOfferings listings={offers} />
    </div>
  );
}
