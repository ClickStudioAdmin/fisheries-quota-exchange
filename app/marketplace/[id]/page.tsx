import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PurchaseForm } from "@/components/purchase-form";
import { buttonClassName } from "@/components/auth-card";
import { LabeledFields, pageWidthClassName, panelClassName } from "@/components/surface";
import { cancelListingAction } from "@/lib/listings/actions";
import { listFisheries } from "@/lib/fisheries/queries";
import { getListing } from "@/lib/listings/queries";
import {
  formatAud,
  listingOfferingLabel,
  listingStatusLabel,
  listingTypeLabel,
} from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { listMyOrganisations, getMyRole } from "@/lib/organisations/queries";
import { getUser } from "@/lib/supabase/server";
import { isPaymentsConfigured } from "@/lib/payments/env";
import { organisationAcceptsCardPayments } from "@/lib/payments/queries";
import { getPlatformSettings } from "@/lib/settings/queries";
import { platformFeeLabel } from "@/lib/settings/types";

export const metadata = {
  title: "Listing",
};

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId)) {
    notFound();
  }

  const listing = await getListing(listingId);

  if (!listing) {
    notFound();
  }

  if (listing.listing_type === "AUCTION") {
    redirect(`/auctions/${listing.id}`);
  }

  const [user, fisheries, settings] = await Promise.all([
    getUser(),
    listFisheries(),
    getPlatformSettings(),
  ]);
  const fishery = fisheries.find((item) => item.name === listing.fishery_name);
  const role = user ? await getMyRole(listing.organisation_id) : null;
  const admin = user ? await isPlatformAdmin() : false;
  const organisations = user ? await listMyOrganisations() : [];
  const buyerOrganisations = organisations.filter(
    (organisation) => organisation.id !== listing.organisation_id,
  );
  const canCancel =
    listing.status === "PENDING_APPROVAL" || listing.status === "PUBLISHED";
  const showCancel =
    canCancel && (admin || role === "OWNER" || role === "ADMIN");
  const expired = new Date(listing.expires_at) <= new Date();
  const paymentsOn = isPaymentsConfigured();
  const sellerAcceptsCards = paymentsOn
    ? await organisationAcceptsCardPayments(listing.organisation_id)
    : true;
  const canPurchase =
    listing.status === "PUBLISHED" &&
    !expired &&
    buyerOrganisations.length > 0 &&
    sellerAcceptsCards;
  const isSeller = role !== null;
  const feeLabel = platformFeeLabel(settings, listing.offering);

  return (
    <div className={`${pageWidthClassName} py-12 sm:py-16`}>
      <p className="text-sm text-ink-muted">
        <Link href="/marketplace" className="underline">
          Marketplace
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        {listing.fishery_name}
      </h1>
      <p className="mt-2 text-ink-muted">
        {listingTypeLabel(listing.listing_type)}
        {fishery ? (
          <>
            {" "}
            ·{" "}
            <Link href={`/fisheries/${fishery.id}`} className="underline">
              View fishery
            </Link>
          </>
        ) : null}
      </p>
      <div className={`mt-8 max-w-lg ${panelClassName}`}>
        <LabeledFields
          items={[
            { label: "Seller", value: listing.seller_name },
            { label: "Type", value: listingOfferingLabel(listing.offering) },
            {
              label: "Quantity",
              value: `${listing.quantity} ${listing.unit_label}`,
            },
            {
              label: "Price",
              value: `${formatAud(listing.unit_price_aud)} per ${listing.unit_label}`,
            },
            ...(feeLabel
              ? [{ label: "Platform fee", value: feeLabel }]
              : []),
            {
              label: "Status",
              value: `${listingStatusLabel(listing.status)}${expired ? " · expired" : ""}`,
            },
            {
              label: "Expires",
              value: new Date(listing.expires_at).toLocaleString("en-AU"),
            },
          ]}
        />
      </div>
      {listing.status === "PUBLISHED" && !expired ? (
        <div className="mt-8">
          {!user ? (
            <p className="text-sm text-ink-muted">
              <Link
                href={`/login?next=/marketplace/${listing.id}`}
                className="underline"
              >
                Sign in
              </Link>{" "}
              to purchase. Quota is reserved when you buy. If the seller
              accepts cards, you pay FQX in Stripe test mode.
            </p>
          ) : organisations.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Create an organisation from the dashboard before purchasing.
            </p>
          ) : isSeller && buyerOrganisations.length === 0 ? (
            <p className="text-sm text-ink-muted">
              You cannot purchase your organisation&apos;s listing. Use a
              different organisation to test a buy.
            </p>
          ) : !sellerAcceptsCards ? (
            <p className="text-sm text-ink-muted">
              This seller has not completed card payment setup, so the listing
              cannot be purchased yet.
            </p>
          ) : canPurchase ? (
            <PurchaseForm
              listingId={listing.id}
              organisations={buyerOrganisations}
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-8 text-sm text-ink-muted">
          This listing is not available to purchase.
        </p>
      )}
      {showCancel ? (
        <form action={cancelListingAction} className="mt-6">
          <input type="hidden" name="listing_id" value={listing.id} />
          <input type="hidden" name="next" value={`/marketplace/${listing.id}`} />
          <button
            type="submit"
            className={buttonClassName}
          >
            Cancel listing
          </button>
        </form>
      ) : null}
    </div>
  );
}
