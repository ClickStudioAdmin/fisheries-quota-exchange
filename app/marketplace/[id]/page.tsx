import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PurchaseForm } from "@/components/purchase-form";
import { SwitchAccountLink } from "@/components/switch-account-notice";
import { TermsRequiredNotice } from "@/components/terms-required-notice";
import { EditListingPriceButton } from "@/components/edit-listing-price-form";
import { buttonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ListingKindBadges } from "@/components/offer-card";
import { OfferDetailLayout } from "@/components/offer-detail-layout";
import { ListingRelatedMarket } from "@/components/listing-related-market";
import { LabeledFieldGroups, pageWidthClassName, panelClassName } from "@/components/surface";
import { formatTableDateTime } from "@/lib/format";
import { cancelListingAction } from "@/lib/listings/actions";
import {
  getHolding,
  listFisheries,
  listHoldingCommitments,
} from "@/lib/fisheries/queries";
import { getListing } from "@/lib/listings/queries";
import {
  canCancelOpenListing,
  canEditListingPrice,
  formatAudPerUnit,
  listingEditMaxQuantity,
  listingStatusLabel,
} from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getActiveOrganisation } from "@/lib/organisations/active-session";
import { listMyOrganisations, getMyRole } from "@/lib/organisations/queries";
import { canBuyForOrganisation } from "@/lib/organisations/permissions";
import { getUser } from "@/lib/supabase/server";
import { isPaymentsConfigured } from "@/lib/payments/env";
import { organisationAcceptsCardPayments } from "@/lib/payments/queries";
import { hasAcceptedCurrentTerms } from "@/lib/terms/queries";

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

  const [user, fisheries, holding, commitments] = await Promise.all([
    getUser(),
    listFisheries(),
    getHolding(listing.holding_id),
    listHoldingCommitments([listing.holding_id]),
  ]);
  const fishery = fisheries.find((item) => item.name === listing.fishery_name);
  const role = user ? await getMyRole(listing.organisation_id) : null;
  const admin = user ? await isPlatformAdmin() : false;
  const organisations = user ? await listMyOrganisations() : [];
  const active = user ? await getActiveOrganisation() : null;
  const listingPath = `/marketplace/${listing.id}`;
  const canSwitch = organisations.length > 1;
  const operatingAsSeller = active?.id === listing.organisation_id;
  const canManage =
    admin ||
    (operatingAsSeller && (role === "OWNER" || role === "ADMIN"));
  const showEdit = canManage && canEditListingPrice(listing);
  const showCancel = canManage && canCancelOpenListing(listing);
  const maxQuantity = listingEditMaxQuantity(
    listing.quantity,
    holding?.quantity,
    commitments.get(listing.holding_id) ?? 0,
  );
  const expired = new Date(listing.expires_at) <= new Date();
  const paymentsOn = isPaymentsConfigured();
  const sellerAcceptsCards = paymentsOn
    ? await organisationAcceptsCardPayments(listing.organisation_id)
    : true;
  const acceptedTerms = user ? await hasAcceptedCurrentTerms() : false;
  const canPurchase =
    listing.status === "PUBLISHED" &&
    !expired &&
    active != null &&
    !operatingAsSeller &&
    sellerAcceptsCards &&
    canBuyForOrganisation(active.role);

  return (
    <div className={`${pageWidthClassName} py-12 sm:py-16`}>
      <p className="text-sm text-ink-muted">
        <Link href="/marketplace" className="underline">
          Marketplace
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {listing.fishery_name}
        </h1>
        <ListingKindBadges listing={listing} />
      </div>
      {fishery ? (
        <p className="mt-2 text-ink-muted">
          <Link href={`/fisheries/${fishery.id}`} className="underline">
            View fishery
          </Link>
        </p>
      ) : null}
      <OfferDetailLayout
        actionTitle="Buy"
        action={
          listing.status === "PUBLISHED" && !expired ? (
            !user ? (
              <p className="text-sm text-ink-muted">
                <Link
                  href={`/login?next=/marketplace/${listing.id}`}
                  className="underline"
                >
                  Log in
                </Link>{" "}
                to purchase. Quota is reserved when you buy. You then pay FQX
                in Stripe test mode: the listed amount by bank debit, or the
                listed amount plus card processing if you pay by
                Australian-issued card. FQX holds the funds until settlement.
              </p>
            ) : organisations.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Add your business details on{" "}
                <Link href="/dashboard/account" className="underline">
                  Business Settings
                </Link>{" "}
                before you can buy.
              </p>
            ) : !active ? (
              <p className="text-sm text-ink-muted">
                <SwitchAccountLink next={listingPath}>
                  Choose a business
                </SwitchAccountLink>{" "}
                before you can buy.
              </p>
            ) : operatingAsSeller ? (
              <p className="text-sm text-ink-muted">
                You cannot purchase this listing while using the seller&apos;s
                business.
                {canSwitch ? (
                  <>
                    {" "}
                    <SwitchAccountLink next={listingPath} /> to buy as another
                    business.
                  </>
                ) : null}
              </p>
            ) : !canBuyForOrganisation(active.role) ? (
              <p className="text-sm text-ink-muted">
                Only owners and admins can buy for this business.
              </p>
            ) : !acceptedTerms ? (
              <TermsRequiredNotice action="buy" />
            ) : !sellerAcceptsCards ? (
              <p className="text-sm text-ink-muted">
                This seller has not completed payment setup, so the listing
                cannot be purchased yet.
              </p>
            ) : canPurchase ? (
              <PurchaseForm listingId={listing.id} />
            ) : (
              <p className="text-sm text-ink-muted">
                This listing is not available to purchase.
              </p>
            )
          ) : (
            <p className="text-sm text-ink-muted">
              This listing is not available to purchase.
            </p>
          )
        }
        related={
          fishery ? (
            <ListingRelatedMarket
              fishery={fishery}
              currentListingId={listing.id}
              offering={listing.offering}
            />
          ) : null
        }
      >
        <div className={panelClassName}>
          <LabeledFieldGroups
            groups={[
              {
                title: "Offer",
                items: [
                  {
                    label: "Quantity",
                    value: `${listing.quantity} ${listing.unit_label}`,
                  },
                  {
                    label: "Price",
                    value: formatAudPerUnit(
                      listing.unit_price_aud,
                      listing.unit_label,
                    ),
                  },
                ],
              },
              {
                items: [{ label: "Seller", value: listing.seller_name }],
              },
              {
                title: "Status",
                items: [
                  {
                    label: "Listing",
                    value: expired
                      ? "Expired"
                      : listingStatusLabel(listing.status),
                  },
                  {
                    label: "Expires",
                    value: formatTableDateTime(listing.expires_at),
                  },
                ],
              },
            ]}
          />
        </div>
        {showEdit || showCancel ? (
          <div className="flex flex-wrap items-center gap-3">
            {showEdit ? (
              <EditListingPriceButton
                title="Edit listing"
                label="Edit listing"
                listingId={listing.id}
                unitLabel={listing.unit_label}
                currentQuantity={listing.quantity}
                maxQuantity={maxQuantity}
                currentPrice={listing.unit_price_aud}
              />
            ) : null}
            {showCancel ? (
              <form action={cancelListingAction}>
                <input type="hidden" name="listing_id" value={listing.id} />
                <input
                  type="hidden"
                  name="next"
                  value={`/marketplace/${listing.id}`}
                />
                <PendingSubmitButton
                  className={buttonClassName}
                  pendingLabel="Cancelling…"
                >
                  Cancel listing
                </PendingSubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}
      </OfferDetailLayout>
    </div>
  );
}
