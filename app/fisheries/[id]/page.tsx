import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FisheryOfferings } from "@/components/listing-card";
import { FisheryLogo } from "@/components/fishery-logo";
import { PriceChart } from "@/components/price-chart";
import { pageWidthClassName, panelClassName, statClassName } from "@/components/surface";
import { getFishery, listJurisdictions } from "@/lib/fisheries/queries";
import { jurisdictionLabel, quantityTypeLabel } from "@/lib/fisheries/types";
import { formatTableDate } from "@/lib/format";
import { formatAudPerUnit } from "@/lib/listings/types";
import {
  listMarketSales,
  listOpenListingsForFishery,
} from "@/lib/market/queries";
import { averageRecentUnitPrice } from "@/lib/market/types";

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

      <dl className="mt-8 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className={statClassName}>
          <dt className="font-medium text-ink">Last sale</dt>
          <dd className="mt-1 text-ink">
            {lastSale
              ? formatAudPerUnit(lastSale.unit_price_aud, unit)
              : "—"}
          </dd>
          {lastSale ? (
            <dd className="mt-1 text-ink-muted">
              {formatTableDate(lastSale.created_at)}
            </dd>
          ) : null}
        </div>
        <div className={statClassName}>
          <dt className="font-medium text-ink">Average sale</dt>
          <dd className="mt-1 text-ink">
            {averageSale != null ? formatAudPerUnit(averageSale, unit) : "—"}
          </dd>
          <dd className="mt-1 text-ink-muted">Last 5</dd>
        </div>
        <div className={statClassName}>
          <dt className="font-medium text-ink">Last lease</dt>
          <dd className="mt-1 text-ink">
            {lastLease
              ? formatAudPerUnit(lastLease.unit_price_aud, unit)
              : "—"}
          </dd>
          {lastLease ? (
            <dd className="mt-1 text-ink-muted">
              {formatTableDate(lastLease.created_at)}
            </dd>
          ) : null}
        </div>
        <div className={statClassName}>
          <dt className="font-medium text-ink">Average lease</dt>
          <dd className="mt-1 text-ink">
            {averageLease != null ? formatAudPerUnit(averageLease, unit) : "—"}
          </dd>
          <dd className="mt-1 text-ink-muted">Last 5</dd>
        </div>
      </dl>

      <FisheryOfferings listings={offers} />

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">Historical prices</h2>
        <div className="mt-4 grid min-w-0 items-start gap-10 md:grid-cols-2">
          <div className={`min-w-0 overflow-hidden ${panelClassName}`}>
            <PriceChart
              kind="sale"
              unitLabel={unit}
              points={sales
                .map((sale) => ({
                  at: sale.created_at,
                  price: Number(sale.unit_price_aud),
                }))
                .filter((point) => Number.isFinite(point.price))}
            />
          </div>
          <div className={`min-w-0 overflow-hidden ${panelClassName}`}>
            <PriceChart
              kind="lease"
              unitLabel={unit}
              points={leases
                .map((lease) => ({
                  at: lease.created_at,
                  price: Number(lease.unit_price_aud),
                }))
                .filter((point) => Number.isFinite(point.price))}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
