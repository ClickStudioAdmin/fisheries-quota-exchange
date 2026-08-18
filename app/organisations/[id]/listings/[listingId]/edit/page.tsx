import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EditListingPriceForm } from "@/components/edit-listing-price-form";
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  canEditListingPrice,
  listingEditPath,
  listingHref,
} from "@/lib/listings/types";
import { getListing } from "@/lib/listings/queries";
import { accountPath } from "@/lib/organisations/paths";
import { loginPath } from "@/lib/auth/paths";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import { getOrganisation } from "@/lib/organisations/queries";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Edit listing",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string; listingId: string }>;
}) {
  const { id, listingId: listingIdParam } = await params;
  const user = await getUser();
  const organisationId = Number(id);
  const listingId = Number(listingIdParam);

  if (!user) {
    redirect(loginPath(listingEditPath({ id: listingId, organisation_id: organisationId })));
  }

  if (!Number.isInteger(organisationId) || !Number.isInteger(listingId)) {
    notFound();
  }

  const listing = await getListing(listingId);

  if (!listing || listing.organisation_id !== organisationId) {
    notFound();
  }

  if (listing.listing_type === "AUCTION") {
    redirect(listingHref(listing));
  }

  const [result, admin] = await Promise.all([
    getOrganisation(organisationId),
    isPlatformAdmin(),
  ]);
  const canManage =
    Boolean(result && canEditOrganisation(result.role)) || admin;

  if (!canManage) {
    notFound();
  }

  if (!canEditListingPrice(listing)) {
    redirect(listingHref(listing));
  }

  return (
    <div>
      <p className="text-sm text-ink-muted">
        <Link
          href={accountPath(organisationId, "/dashboard/listings")}
          className="underline"
        >
          {result?.organisation.legal_name ?? "Listings"}
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        Edit listing
      </h1>
      <p className="mt-2 max-w-lg text-sm text-ink-muted">
        Change the unit price. Quantity, type, and expiry stay the same.
        Buyers pay the price shown at purchase.
      </p>
      <p className="mt-4 text-sm text-ink">
        {listing.fishery_name} · {listing.quantity} {listing.unit_label}
      </p>
      <div className="mt-6 max-w-md">
        <EditListingPriceForm
          listingId={listing.id}
          unitLabel={listing.unit_label}
          currentPrice={listing.unit_price_aud}
          next={listingHref(listing)}
        />
      </div>
    </div>
  );
}
