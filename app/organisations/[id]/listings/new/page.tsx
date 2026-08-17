import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreateListingForm } from "@/components/create-listing-form";
import {
  listAllQuotaTypes,
  listAllSeasons,
  listAllStocks,
  listHoldingsForOrganisation,
} from "@/lib/fisheries/queries";
import { accountPath } from "@/lib/organisations/paths";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import { getOrganisation } from "@/lib/organisations/queries";
import { holdingIsVerified } from "@/lib/fisheries/types";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Create listing",
};

export default async function NewListingPage({
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

  const [holdings, stocks, seasons, quotaTypes] = await Promise.all([
    listHoldingsForOrganisation(organisationId),
    listAllStocks(),
    listAllSeasons(),
    listAllQuotaTypes(),
  ]);
  const holding = holdings.find((item) => item.id === holdingId);

  if (!holding) {
    notFound();
  }

  if (!holdingIsVerified(holding)) {
    redirect(accountPath(organisationId, "/dashboard/holdings"));
  }

  const stock = stocks.find((item) => item.id === holding.stock_id);
  const season = seasons.find((item) => item.id === holding.season_id);
  const quotaType = quotaTypes.find((item) => item.id === holding.quota_type_id);

  return (
    <div>
      <p className="text-sm text-ink-muted">
        <Link href={accountPath(organisationId, "/dashboard/listings")} className="underline">
          {result.organisation.legal_name}
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        Create listing
      </h1>
      <p className="mt-2 max-w-lg text-sm text-ink-muted">
        Fixed-price only. A platform admin must approve the listing before it
        appears on the marketplace. Quota is reserved when a buyer purchases,
        not when you create the listing.
      </p>
      <p className="mt-4 text-sm text-ink">
        {stock?.name} · {season?.name} · {holding.quantity}{" "}
        {quotaType?.unit_label} available
      </p>
      <div className="mt-6 max-w-md">
        <CreateListingForm
          organisationId={organisationId}
          holdingId={holding.id}
          maxQuantity={holding.quantity}
          unitLabel={quotaType?.unit_label ?? "units"}
        />
      </div>
    </div>
  );
}
