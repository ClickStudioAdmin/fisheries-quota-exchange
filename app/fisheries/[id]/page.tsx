import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FisheryOfferings } from "@/components/listing-card";
import { FisheryLogo } from "@/components/fishery-logo";
import { PriceChart } from "@/components/price-chart";
import { panelClassName, pageWidthClassName, statClassName } from "@/components/surface";
import { getFishery, listJurisdictions } from "@/lib/fisheries/queries";
import { jurisdictionLabel, quantityTypeLabel } from "@/lib/fisheries/types";
import { formatTableDate } from "@/lib/format";
import { formatAud } from "@/lib/listings/types";
import {
  listMarketSales,
  listOpenListingsForFishery,
} from "@/lib/market/queries";
import { averageRecentUnitPrice, type MarketSale } from "@/lib/market/types";

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
  const averageSale = averageRecentUnitPrice(sales);
  const averageLease = averageRecentUnitPrice(leases);
  const volume = sales.reduce(
    (sum: number, sale: MarketSale) => sum + Number(sale.quantity),
    0,
  );

  return (
    <div className={`${pageWidthClassName} py-12 sm:py-16`}>
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
            {jurisdictionLabel(jurisdiction)}
            {fishery.code ? ` · ${fishery.code}` : ""} · quantity in {unit}
          </p>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-5 gap-3 text-sm">
        <div className={statClassName}>
          <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">Last sale</dt>
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
        <div className={statClassName}>
          <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">Last lease</dt>
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
        <div className={statClassName}>
          <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">Average sale</dt>
          <dd className="mt-1 text-ink">
            {averageSale != null ? `${formatAud(averageSale)} / ${unit}` : "—"}
          </dd>
          <dd className="mt-1 text-ink-muted">Last 5</dd>
        </div>
        <div className={statClassName}>
          <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">Average lease</dt>
          <dd className="mt-1 text-ink">
            {averageLease != null ? `${formatAud(averageLease)} / ${unit}` : "—"}
          </dd>
          <dd className="mt-1 text-ink-muted">Last 5</dd>
        </div>
        <div className={statClassName}>
          <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">Volume traded</dt>
          <dd className="mt-1 text-ink">
            {sales.length === 0
              ? "—"
              : `${volume} ${unit} · ${sales.length} ${
                  sales.length === 1 ? "sale" : "sales"
                }`}
          </dd>
        </div>
      </dl>

      <FisheryOfferings listings={offers} />

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">Sale prices</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Completed and in-progress sales. Leases are not included.
        </p>
        <div className={`mt-4 ${panelClassName}`}>
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
    </div>
  );
}
