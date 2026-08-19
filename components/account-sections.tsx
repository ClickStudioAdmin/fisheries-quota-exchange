import Link from "next/link";
import { AddMemberForm } from "@/components/add-member-form";
import { MemberList } from "@/components/member-list";
import { BusinessDetailsForm } from "@/components/business-details-form";
import {
  PersonProfileForm,
  ProfilePasswordForm,
} from "@/components/person-profile-form";
import { userFullName, userPhone } from "@/lib/auth/display-name";
import type { User } from "@supabase/supabase-js";
import { DataTable, DataTableRowExtras, TableActionRow, tableLinkClassName } from "@/components/data-table";
import { OrderTableDownloads, OrderTableLinks } from "@/components/order-table-links";
import { HoldingForm } from "@/components/holding-form";
import { EditHoldingButton } from "@/components/holding-actions";
import { EditListingPriceButton } from "@/components/edit-listing-price-form";
import {
  listFisheries,
  listHoldingCommitments,
  listHoldingsForOrganisation,
  listJurisdictions,
} from "@/lib/fisheries/queries";
import {
  fisherySelectLabel,
  fisherySelectLabelForName,
  holdingIsVerified,
  holdingVerificationLabel,
  quantityTypeLabel,
} from "@/lib/fisheries/types";
import {
  canCancelOpenListing,
  canEditListingPrice,
  formatAud,
  listingEditMaxQuantity,
  listingOfferingLabel,
  listingStatusLabel,
  listingTypeLabel,
} from "@/lib/listings/types";
import { listOrganisationListings } from "@/lib/listings/queries";
import { listingIdsWithBids } from "@/lib/auctions/queries";
import {
  latestSalePriceMap,
  listLatestSalePrices,
} from "@/lib/market/queries";
import { marketValue } from "@/lib/market/types";
import { cancelListingAction } from "@/lib/listings/actions";
import { listOrganisationOrders } from "@/lib/orders/queries";
import { orderStatusLabel } from "@/lib/orders/types";
import { tableButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { formatTableDate } from "@/lib/format";
import { accountPath, accountPaymentsPath, dashboardHoldingPath } from "@/lib/organisations/paths";
import { canAddMember, canEditOrganisation } from "@/lib/organisations/permissions";
import { getOrganisation, listMembers } from "@/lib/organisations/queries";
import { organisationCanSellError } from "@/lib/payments/sell-access";
import { PaymentsSetupNotice } from "@/components/payments-setup-notice";
import { SuccessNotice } from "@/components/surface";

type AccountSectionProps = {
  organisationId: number;
  userEmail: string;
};

export async function AccountProfileSection({
  organisationId,
  user,
}: {
  organisationId: number | null;
  user: User;
}) {
  const result = organisationId ? await getOrganisation(organisationId) : null;
  const canEdit = result ? canEditOrganisation(result.role) : false;

  return (
    <div className="space-y-10">
      <section className="max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-ink">Details</h2>
        <PersonProfileForm
          fullName={userFullName(user)}
          email={user.email ?? ""}
          phone={userPhone(user)}
          organisation={result?.organisation ?? null}
          canEditOrganisation={canEdit}
        />
      </section>
      {result ? null : (
        <section className="max-w-md space-y-4">
          <h2 className="text-xl font-semibold text-ink">Business details</h2>
          <p className="text-sm text-ink-muted">
            Legal name is required. Trading name and ABN are optional. This
            creates your organisation. You can own one account.
          </p>
          <BusinessDetailsForm />
        </section>
      )}
    </div>
  );
}

export function AccountSecuritySection() {
  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-ink-muted">
        Change the password you use to sign in to FQX.
      </p>
      <ProfilePasswordForm />
    </div>
  );
}

export async function AccountMembersSection({
  organisationId,
  userEmail,
}: AccountSectionProps) {
  const result = await getOrganisation(organisationId);

  if (!result) {
    return <p>Account not found.</p>;
  }

  const members = await listMembers(organisationId);
  const canInvite = canAddMember(result.role);

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-muted">
        Add people to this account with a role. They sign in with that email.
        No invitation email is sent yet.
      </p>
      <MemberList
        organisationId={organisationId}
        members={members}
        actorRole={result.role}
        actorEmail={userEmail}
      />
      {canInvite ? (
        <section className="max-w-md">
          <h2 className="text-xl font-semibold text-ink">Add person</h2>
          <div className="mt-4">
            <AddMemberForm
              organisationId={organisationId}
              actorRole={result.role}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export async function AccountHoldingsSection({
  organisationId,
  created,
  listingId,
}: {
  organisationId: number;
  created?: string;
  listingId?: number;
}) {
  const result = await getOrganisation(organisationId);

  if (!result) {
    return <p>Account not found.</p>;
  }

  const canManage = canEditOrganisation(result.role);
  const [holdings, fisheries, jurisdictions, prices, sellError] =
    await Promise.all([
      listHoldingsForOrganisation(organisationId),
      listFisheries(),
      listJurisdictions(),
      listLatestSalePrices(),
      organisationCanSellError(organisationId),
    ]);
  const commitments = await listHoldingCommitments(
    holdings.map((holding) => holding.id),
  );
  const lastSale = latestSalePriceMap(prices);
  const valued = holdings.map((holding) => {
    const sale = lastSale.get(holding.fishery_id);
    if (!sale) {
      return null;
    }

    return marketValue(holding.quantity, sale.unit_price_aud);
  });
  const portfolioValue = valued.reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const missingPrices = valued.some((value) => value == null);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Quota Holdings
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {canManage
            ? "Create or update a holding here. Unverified holdings must be approved by a platform admin before you can list or auction them. Changing quantity records an ADJUSTMENT on the ledger."
            : "Owners and admins can create and update holdings for this account."}
        </p>
        {created === "pending" || created === "listing" ? (
          <SuccessNotice
            title="Listing created"
            action={
              listingId ? (
                <Link
                  href={`/marketplace/${listingId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-sea underline"
                >
                  View Listing
                </Link>
              ) : null
            }
          >
            {created === "pending"
              ? "A platform admin must approve it before it appears on the marketplace."
              : null}
          </SuccessNotice>
        ) : null}
        {canManage && sellError ? (
          <div className="mt-4">
            <PaymentsSetupNotice
              href={accountPaymentsPath(organisationId)}
            />
          </div>
        ) : null}
        {holdings.length > 0 ? (
          <div className="mt-4 border border-line bg-paper-raised p-4">
            <p className="text-sm text-ink-muted">Portfolio value</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              {formatAud(portfolioValue)}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Estimated from the most recent sale in each fishery.
              {missingPrices
                ? " Holdings with no sale yet are counted as $0."
                : ""}
            </p>
          </div>
        ) : null}
      </div>
      <DataTable
        caption="Quota Holdings"
        empty="No holdings yet."
        searchPlaceholder="Filter holdings…"
        defaultSort={{ key: "fishery", direction: "asc" }}
        columns={[
          { key: "fishery", header: "Fishery", sortable: true, filter: "select" },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          {
            key: "marketValue",
            header: "Market value",
            sortable: true,
            align: "right",
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "Verified", label: "Verified" },
              { value: "Pending verification", label: "Pending verification" },
            ],
          },
        ]}
        rows={holdings.map((holding) => {
          const fishery = fisheries.find((item) => item.id === holding.fishery_id);
          const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "";
          const sale = lastSale.get(holding.fishery_id);
          const value = sale
            ? marketValue(holding.quantity, sale.unit_price_aud)
            : null;

          return {
            id: holding.id,
            values: {
              fishery: fishery
                ? fisherySelectLabel(fishery, jurisdictions)
                : "Fishery",
              quantity: holding.quantity,
              marketValue: value ?? "",
              status: holdingVerificationLabel(holding.verification_status),
            },
            display: {
              quantity: `${holding.quantity} ${unit}`.trim(),
              marketValue: value != null ? formatAud(value) : "—",
            },
          };
        })}
      >
        {holdings.map((holding) => {
          const fishery = fisheries.find((item) => item.id === holding.fishery_id);
          const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "units";
          const verified = holdingIsVerified(holding);
          const listed = commitments.get(holding.id) ?? 0;
          const available = Number(holding.quantity) - listed;

          return (
            <DataTableRowExtras
              key={holding.id}
              id={holding.id}
              links={
                <TableActionRow>
                  <Link
                    href={dashboardHoldingPath(holding.id, organisationId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={tableLinkClassName}
                  >
                    Details
                  </Link>
                  <Link
                    href={`/fisheries/${holding.fishery_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={tableLinkClassName}
                  >
                    View market
                  </Link>
                </TableActionRow>
              }
              actions={
                canManage ? (
                  <>
                    {verified && available > 0 ? (
                      <>
                        {sellError ? (
                          <>
                            <button
                              type="button"
                              disabled
                              className={tableButtonClassName}
                            >
                              Create listing
                            </button>
                            <button
                              type="button"
                              disabled
                              className={tableButtonClassName}
                            >
                              Create auction
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              href={`/organisations/${organisationId}/listings/new?holding_id=${holding.id}`}
                              className={tableButtonClassName}
                            >
                              Create listing
                            </Link>
                            <Link
                              href={`/organisations/${organisationId}/auctions/new?holding_id=${holding.id}`}
                              className={tableButtonClassName}
                            >
                              Create auction
                            </Link>
                          </>
                        )}
                      </>
                    ) : null}
                    <EditHoldingButton
                      title={`Edit ${fishery?.name ?? "holding"}`}
                      holdingId={holding.id}
                      quantity={holding.quantity}
                      unitLabel={unit}
                      minQuantity={String(listed)}
                    />
                    {verified && available <= 0 ? (
                      <p className="max-w-xs whitespace-normal text-sm text-ink-muted">
                        All of this holding is listed. Cancel a listing to list
                        more, or increase the holding quantity.
                      </p>
                    ) : null}
                    {!verified ? (
                      <p className="max-w-xs whitespace-normal text-sm text-ink-muted">
                        Waiting for admin verification before listing.
                      </p>
                    ) : null}
                  </>
                ) : null
              }
            />
          );
        })}
      </DataTable>
      {canManage ? (
        <div className="max-w-md">
          <h2 className="text-xl font-semibold text-ink">Add holding</h2>
          <div className="mt-4">
            <HoldingForm
              organisationId={organisationId}
              fisheries={fisheries}
              jurisdictions={jurisdictions}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export async function AccountListingsSection({
  organisationId,
}: {
  organisationId: number;
}) {
  const result = await getOrganisation(organisationId);

  if (!result) {
    return <p>Account not found.</p>;
  }

  const listings = await listOrganisationListings(organisationId);
  const [fisheries, jurisdictions, sellError, auctionBidIds, holdings, commitments] =
    await Promise.all([
      listFisheries(),
      listJurisdictions(),
      organisationCanSellError(organisationId),
      listingIdsWithBids(
        listings
          .filter((listing) => listing.listing_type === "AUCTION")
          .map((listing) => listing.id),
      ),
      listHoldingsForOrganisation(organisationId),
      listHoldingCommitments(listings.map((listing) => listing.holding_id)),
    ]);
  const canList = canEditOrganisation(result.role);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Listings
      </h1>
      {canList && sellError ? (
        <PaymentsSetupNotice
          href={accountPaymentsPath(organisationId)}
        />
      ) : null}
      <DataTable
        caption="Listings"
        empty="No listings yet. Owners and admins can list quota from a holding."
        searchPlaceholder="Filter listings…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "ID", sortable: true, details: true, nowrap: true },
          {
            key: "type",
            header: "Listing type",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "FIXED_PRICE", label: "Fixed price" },
              { value: "AUCTION", label: "Auction" },
            ],
          },
          {
            key: "offering",
            header: "Offering",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "SALE", label: "Sale" },
              { value: "LEASE", label: "Lease" },
            ],
          },
          { key: "fishery", header: "Fishery", sortable: true, filter: "select" },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          { key: "price", header: "Price", sortable: true, align: "right" },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "PENDING_APPROVAL", label: "Pending approval" },
              { value: "PUBLISHED", label: "Published" },
              { value: "RESERVED", label: "Reserved" },
              { value: "SOLD", label: "Sold" },
              { value: "UNSOLD", label: "Unsold" },
              { value: "CANCELLED", label: "Cancelled" },
              { value: "REJECTED", label: "Rejected" },
            ],
          },
        ]}
        rows={listings.map((listing) => ({
          id: listing.id,
          details: [
            { label: "Created", value: formatTableDate(listing.created_at) },
          ],
          values: {
            id: listing.id,
            type: listing.listing_type,
            fishery: fisherySelectLabelForName(
              listing.fishery_name,
              fisheries,
              jurisdictions,
            ),
            offering: listing.offering,
            quantity: listing.quantity,
            price: listing.unit_price_aud,
            status: listing.status,
            created: listing.created_at,
          },
          display: {
            type: listingTypeLabel(listing.listing_type),
            offering: listingOfferingLabel(listing.offering),
            quantity: `${listing.quantity} ${listing.unit_label}`,
            price: formatAud(listing.unit_price_aud),
            status: listingStatusLabel(listing.status),
          },
        }))}
      >
        {listings.map((listing) => {
          const bidCount = auctionBidIds.has(listing.id) ? 1 : 0;
          const showEdit = canList && canEditListingPrice(listing);
          const showCancel =
            canList && canCancelOpenListing(listing, bidCount);
          const holding = holdings.find((item) => item.id === listing.holding_id);
          const maxQuantity = listingEditMaxQuantity(
            listing.quantity,
            holding?.quantity,
            commitments.get(listing.holding_id) ?? 0,
          );

          return (
          <DataTableRowExtras
            key={listing.id}
            id={listing.id}
            links={
              <Link
                href={
                  listing.listing_type === "AUCTION"
                    ? `/auctions/${listing.id}`
                    : `/marketplace/${listing.id}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className={tableLinkClassName}
              >
                View
              </Link>
            }
            actions={
              showEdit || showCancel ? (
                <>
                  {showEdit ? (
                    <EditListingPriceButton
                      title="Edit listing"
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
                        value={accountPath(organisationId, "/dashboard/listings")}
                      />
                      <PendingSubmitButton
                        className={tableButtonClassName}
                        pendingLabel="Cancelling…"
                      >
                        Cancel
                      </PendingSubmitButton>
                    </form>
                  ) : null}
                </>
              ) : null
            }
          />
          );
        })}
      </DataTable>
    </div>
  );
}

export async function AccountOrdersSection({
  organisationId,
}: {
  organisationId: number;
}) {
  const result = await getOrganisation(organisationId);

  if (!result) {
    return <p>Account not found.</p>;
  }

  const [orders, fisheries, jurisdictions] = await Promise.all([
    listOrganisationOrders(organisationId),
    listFisheries(),
    listJurisdictions(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Orders</h1>
      <DataTable
        caption="Orders"
        empty="No buys or sells for this account yet."
        searchPlaceholder="Filter orders…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "Order", sortable: true, details: true, nowrap: true },
          {
            key: "side",
            header: "Side",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "Selling", label: "Selling" },
              { value: "Buying", label: "Buying" },
            ],
          },
          {
            key: "offering",
            header: "Offering",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "SALE", label: "Sale" },
              { value: "LEASE", label: "Lease" },
            ],
          },
          {
            key: "fishery",
            header: "Fishery",
            sortable: true,
            filter: "select",
          },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
              { value: "AWAITING_COMPLIANCE", label: "Awaiting compliance" },
              { value: "AWAITING_TRANSFER", label: "Awaiting transfer" },
              { value: "AWAITING_SETTLEMENT", label: "Awaiting settlement" },
              { value: "COMPLETED", label: "Completed" },
              { value: "REJECTED", label: "Rejected" },
              { value: "CANCELLED", label: "Cancelled" },
            ],
          },
        ]}
        rows={orders.map((order) => {
          const side =
            order.seller_organisation_id === organisationId
              ? "Selling"
              : "Buying";

          return {
            id: order.id,
            details: [
              { label: "Created", value: formatTableDate(order.created_at) },
            ],
            values: {
              id: order.id,
              side,
              fishery: fisherySelectLabelForName(
                order.fishery_name,
                fisheries,
                jurisdictions,
              ),
              offering: order.offering,
              quantity: order.quantity,
              status: order.status,
              created: order.created_at,
            },
            display: {
              offering: order.offering === "SALE" ? "Sale" : "Lease",
              quantity: `${order.quantity} ${order.unit_label}`,
              status: orderStatusLabel(order.status),
            },
          };
        })}
      >
        {orders.map((order) => (
          <DataTableRowExtras
            key={order.id}
            id={order.id}
            links={<OrderTableLinks orderId={order.id} />}
            downloads={
              <OrderTableDownloads
                orderId={order.id}
                settled={order.status === "COMPLETED"}
              />
            }
          />
        ))}
      </DataTable>
    </div>
  );
}
