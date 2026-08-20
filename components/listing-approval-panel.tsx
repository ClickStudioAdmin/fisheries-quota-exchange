import Link from "next/link";
import { ReviewListingForms } from "@/components/review-listing-forms";
import { ReviewChecklistForm } from "@/components/review-checklist-form";
import { LabeledFieldGroups, LabeledFields, panelClassName } from "@/components/surface";
import { saveListingApprovalChecklistAction } from "@/lib/listings/actions";
import { getListingApprovalWorkspace } from "@/lib/listings/approval";
import {
  formatAud,
  formatAudPerUnit,
  formatListingTotal,
  listingHref,
  listingOfferingLabel,
  listingTypeLabel,
} from "@/lib/listings/types";
import { formatTableDateTime } from "@/lib/format";
import { jurisdictionLabel, quantityTypeLabel } from "@/lib/fisheries/types";
import { formatAustralianAddress } from "@/lib/organisations/address";
import { entityKindLabel } from "@/lib/organisations/types";
import { tradeRequiresQldProfile } from "@/lib/organisations/completeness";
import { adminHoldingPath } from "@/lib/organisations/paths";

function display(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text || "—";
}

export async function ListingApprovalPanel({
  listingId,
  reviewQueue = [],
}: {
  listingId: number;
  reviewQueue?: number[];
}) {
  const workspace = await getListingApprovalWorkspace(listingId);

  if (!workspace) {
    return <p className="text-sm text-ink-muted">Listing not found.</p>;
  }

  const {
    listing,
    holding,
    holdingStatusLabel,
    fishery,
    jurisdiction,
    organisation,
    organisationName,
    qldProfile,
    listed,
    available,
    checks,
  } = workspace;
  const qld = tradeRequiresQldProfile(jurisdiction?.code);
  const unit = fishery
    ? quantityTypeLabel(fishery.quantity_type)
    : listing.unit_label;
  const company = organisation?.entity_kind === "COMPANY";
  const auction = listing.listing_type === "AUCTION";
  const price = auction
    ? listing.starting_price_aud ?? listing.unit_price_aud
    : listing.unit_price_aud;

  return (
    <div className="mt-2 min-w-0 space-y-6">
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Listing</h3>
          <div className="mt-4">
            <LabeledFields
              items={[
                { label: "Listing", value: String(listing.id) },
                { label: "Seller", value: organisationName },
                {
                  label: "Type",
                  value: listingTypeLabel(listing.listing_type),
                },
                {
                  label: "Offering",
                  value: listingOfferingLabel(listing.offering),
                },
                {
                  label: "Fishery",
                  value: fishery?.name ?? listing.fishery_name,
                },
                {
                  label: "Jurisdiction",
                  value: jurisdictionLabel(jurisdiction),
                },
                {
                  label: "Quantity",
                  value: `${listing.quantity} ${unit}`,
                },
                {
                  label: auction ? "Starting price" : "Unit price",
                  value: formatAudPerUnit(price, unit),
                },
                ...(auction
                  ? [
                      {
                        label: "Reserve",
                        value: listing.reserve_price_aud
                          ? formatAud(listing.reserve_price_aud)
                          : "None",
                      },
                      {
                        label: "Bid increment",
                        value: listing.bid_increment_aud
                          ? formatAud(listing.bid_increment_aud)
                          : "—",
                      },
                      {
                        label: "Starts",
                        value: listing.starts_at
                          ? formatTableDateTime(listing.starts_at)
                          : "—",
                      },
                    ]
                  : [
                      {
                        label: "Total",
                        value: formatListingTotal(
                          listing.quantity,
                          listing.unit_price_aud,
                        ),
                      },
                    ]),
                {
                  label: auction ? "Ends" : "Expires",
                  value: formatTableDateTime(listing.expires_at),
                },
              ]}
            />
          </div>
          <p className="mt-4 text-sm">
            <Link
              href={listingHref(listing)}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open listing
            </Link>
          </p>
        </section>
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">
            {qld ? "Queensland checks" : "Approval checks"}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Work through these steps before the listing goes live. Save
            progress if you need to come back.
          </p>
          <div className="mt-4">
            <ReviewChecklistForm
              action={saveListingApprovalChecklistAction}
              hidden={{ listing_id: String(listing.id) }}
              checks={checks}
              completed={listing.approval_checklist}
              hint="Save as you work. Approving still records the decision."
            />
          </div>
        </section>
      </div>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Seller</h3>
          {organisation ? (
            <div className="mt-4">
              <LabeledFieldGroups
                groups={[
                  {
                    items: [
                      {
                        label: "Entity",
                        value: organisation.entity_kind
                          ? entityKindLabel(organisation.entity_kind)
                          : "—",
                      },
                      ...(company
                        ? [{ label: "ACN", value: display(organisation.acn) }]
                        : []),
                      { label: "ABN", value: display(organisation.abn) },
                      {
                        label: "Legal name",
                        value: display(organisation.legal_name),
                      },
                      {
                        label: "Trading name",
                        value: display(organisation.trading_name),
                      },
                      { label: "Phone", value: display(organisation.mobile) },
                    ],
                  },
                  {
                    title: "Address",
                    columns: 1,
                    items: [
                      {
                        label: "Registered",
                        value:
                          formatAustralianAddress(
                            organisation.registered_address,
                          ) || "—",
                      },
                    ],
                  },
                  ...(qld
                    ? [
                        {
                          title: "Queensland Fisheries",
                          items: [
                            {
                              label: "Client number",
                              value: display(qldProfile?.client_reference),
                            },
                            {
                              label: "Commercial fishing licence",
                              value: display(qldProfile?.licence_number),
                            },
                          ],
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Business details are not available yet.
            </p>
          )}
        </section>
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Holding</h3>
          {holding ? (
            <>
              <div className="mt-4">
                <LabeledFields
                  items={[
                    { label: "Holding", value: String(holding.id) },
                    { label: "Status", value: holdingStatusLabel },
                    {
                      label: "Quantity",
                      value: `${holding.quantity} ${unit}`,
                    },
                    {
                      label: "Listed",
                      value: `${listed} ${unit}`,
                    },
                    {
                      label: "Available",
                      value: `${available} ${unit}`,
                    },
                  ]}
                />
              </div>
              <p className="mt-4 text-sm">
                <Link
                  href={adminHoldingPath(holding.id)}
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open holding record
                </Link>
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">Holding not found.</p>
          )}
        </section>
      </div>
      <section className={panelClassName}>
        <h3 className="text-lg font-semibold text-ink">Decision</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Approving publishes this listing. It does not move quota.
        </p>
        <div className="mt-4">
          <ReviewListingForms listingId={listing.id} reviewQueue={reviewQueue} />
        </div>
      </section>
    </div>
  );
}
