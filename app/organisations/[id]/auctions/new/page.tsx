import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreateAuctionForm } from "@/components/create-auction-form";
import {
  listFisheries,
  listHoldingCommitments,
  listHoldingsForOrganisation,
} from "@/lib/fisheries/queries";
import { accountPath } from "@/lib/organisations/paths";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import { getOrganisation } from "@/lib/organisations/queries";
import { holdingIsVerified, quantityTypeLabel } from "@/lib/fisheries/types";
import { getUser } from "@/lib/supabase/server";
import { organisationCanSellError } from "@/lib/payments/sell-access";
import { getPlatformSettings, isVerifiedUser } from "@/lib/settings/queries";
import { platformFeeDisclosure } from "@/lib/settings/types";

export const metadata = {
  title: "Create auction",
};

export default async function NewAuctionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ holding_id?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const organisationId = Number(id);
  const query = await searchParams;
  const holdingId = Number(query.holding_id);

  if (!Number.isInteger(organisationId) || !Number.isInteger(holdingId)) {
    notFound();
  }

  const result = await getOrganisation(organisationId);

  if (!result || !canEditOrganisation(result.role)) {
    notFound();
  }

  const [holdings, fisheries, settings, verified, sellError] = await Promise.all([
    listHoldingsForOrganisation(organisationId),
    listFisheries(),
    getPlatformSettings(),
    isVerifiedUser(),
    organisationCanSellError(organisationId),
  ]);
  const holding = holdings.find((item) => item.id === holdingId);

  if (!holding) {
    notFound();
  }

  if (!holdingIsVerified(holding)) {
    redirect(accountPath(organisationId, "/dashboard/holdings"));
  }

  const commitments = await listHoldingCommitments([holding.id]);
  const available = Number(holding.quantity) - (commitments.get(holding.id) ?? 0);

  if (!(available > 0)) {
    redirect(accountPath(organisationId, "/dashboard/holdings"));
  }

  const fishery = fisheries.find((item) => item.id === holding.fishery_id);
  const unitLabel = fishery
    ? quantityTypeLabel(fishery.quantity_type)
    : "units";
  const availableLabel = String(available);
  const autoPublish = verified && settings.auto_approve_listings;
  const feeNote = platformFeeDisclosure(settings);

  return (
    <div>
      <p className="text-sm text-ink-muted">
        <Link href={accountPath(organisationId, "/dashboard/holdings")} className="underline">
          {result.organisation.legal_name}
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        Create auction
      </h1>
      <p className="mt-2 max-w-lg text-sm text-ink-muted">
        {autoPublish
          ? "English auction. This auction will be published immediately."
          : "English auction. A platform admin must approve it before bidding starts."}{" "}
        Bid timestamps are recorded by the database, not the browser. A winning
        close creates a simulated order.
      </p>
      <p className="mt-4 text-sm text-ink">
        {fishery?.name ?? "Fishery"} · {availableLabel} {unitLabel} available
      </p>
      <div className="mt-6 max-w-md">
        {sellError ? (
          <p className="text-sm text-ink-muted">
            {sellError}{" "}
            <Link
              href={accountPath(organisationId, "/dashboard/payments")}
              className="underline"
            >
              Go to Payments
            </Link>
          </p>
        ) : (
          <CreateAuctionForm
            organisationId={organisationId}
            holdingId={holding.id}
            maxQuantity={availableLabel}
            unitLabel={unitLabel}
            autoPublish={autoPublish}
            feeNote={feeNote}
          />
        )}
      </div>
    </div>
  );
}
