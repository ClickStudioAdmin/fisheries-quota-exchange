import Link from "next/link";
import { AddMemberForm } from "@/components/add-member-form";
import { OrganisationInvitationList } from "@/components/invitation-lists";
import { MemberList } from "@/components/member-list";
import { BusinessDetailsForm } from "@/components/business-details-form";
import { OrganisationDetailsForm } from "@/components/organisation-details-form";
import { AccountNotificationForm } from "@/components/account-notification-form";
import { ListingAlertsForm } from "@/components/listing-alerts-form";
import { NotificationSettingsForm } from "@/components/notification-settings-form";
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
import { orderStatusLabelFor } from "@/lib/transfers/display";
import { listTransferApplicationsByOrderIds } from "@/lib/transfers/queries";
import { tableButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { formatTableDate } from "@/lib/format";
import { accountPath, accountPaymentsPath, accountSettingsPath, dashboardHoldingPath } from "@/lib/organisations/paths";
import {
  getMyNotificationPreferences,
  listMyListingAlerts,
  myProfileNotificationEmailIds,
} from "@/lib/alerts/queries";
import { ACCOUNT_NOTIFICATION_EMAIL_IDS } from "@/lib/email/product-emails";
import { canAddMember, canEditOrganisation } from "@/lib/organisations/permissions";
import { getOrganisation, getOrganisationJurisdictionProfile, listMembers, listOrganisationInvitations } from "@/lib/organisations/queries";
import { organisationCanSellError } from "@/lib/payments/sell-access";
import { PaymentsSetupNotice } from "@/components/payments-setup-notice";
import { BusinessDetailsRequiredNotice } from "@/components/business-details-required-notice";
import {
  missingBusinessDetailFields,
  tradeReadyFieldLabels,
} from "@/lib/organisations/completeness";
import { SuccessNotice } from "@/components/notices";

type AccountSectionProps = {
  organisationId: number;
  userEmail: string;
};

export async function AccountProfileSection({
  user,
}: {
  user: User;
}) {
  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-ink-muted">
        These details are yours. They do not change when you switch business.
      </p>
      <PersonProfileForm
        fullName={userFullName(user)}
        email={user.email ?? ""}
        phone={userPhone(user)}
      />
    </div>
  );
}

export async function AccountBusinessSection({
  organisationId,
}: {
  organisationId: number | null;
}) {
  const result = organisationId ? await getOrganisation(organisationId) : null;
  const canEdit = result ? canEditOrganisation(result.role) : false;
  const jurisdictions = organisationId ? await listJurisdictions() : [];
  const qldJurisdiction = jurisdictions.find((item) => item.code === "QLD") ?? null;
  const qldProfile =
    result && qldJurisdiction
      ? await getOrganisationJurisdictionProfile(
          result.organisation.id,
          qldJurisdiction.id,
        )
      : null;

  if (!result) {
    return (
      <div className="max-w-md space-y-4">
        <p className="text-sm text-ink-muted">
          Legal name is required to create a business. You can own one business.
          Complete the remaining required fields on this page before you can buy
          or list quota.
        </p>
        <BusinessDetailsForm />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <p className="max-w-2xl text-sm text-ink-muted">
        Fields marked required must be completed before you can buy or list
        quota. Select Queensland to show fisheries client number and primary
        licence, which are required for Queensland trades. Trading name, address
        line 2, fishery symbols, and Hide my Identity are optional.
      </p>
      <OrganisationDetailsForm
        organisation={result.organisation}
        jurisdictions={jurisdictions}
        qldProfile={qldProfile}
        canEdit={canEdit}
      />
    </div>
  );
}

export async function AccountAlertsSection() {
  const [fisheries, jurisdictions, alerts] = await Promise.all([
    listFisheries(),
    listJurisdictions(),
    listMyListingAlerts(),
  ]);

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-ink-muted">
        Choose which fisheries to watch. A published sale or lease listing
        (including auctions) notifies you when that switch is on. These alerts
        are yours and apply across every business you belong to.
      </p>
      <ListingAlertsForm
        fisheries={fisheries}
        jurisdictions={jurisdictions}
        alerts={alerts}
      />
    </div>
  );
}

export async function AccountProfileNotificationsSection() {
  const [prefs, emailIds] = await Promise.all([
    getMyNotificationPreferences(),
    myProfileNotificationEmailIds(),
  ]);

  return (
    <NotificationSettingsForm
      scope="profile"
      disabledEmails={prefs.disabledEmails}
      disabledInApp={prefs.disabledInApp}
      emailIds={emailIds}
      description="Invitations and listing-alert channel switches for this login. They stay with you when you switch business. Bids, purchases, payments, and settlement are on Business Settings → Notifications. Fishery watches are on Alerts. Notices you have received are in Inbox."
    />
  );
}

export async function AccountNotificationsSection({
  organisationId,
}: {
  organisationId: number;
}) {
  const result = await getOrganisation(organisationId);

  if (!result) {
    return <p>Business not found.</p>;
  }

  const members = await listMembers(organisationId);
  const canEdit = canEditOrganisation(result.role);
  const showRoles = members.length > 1;

  return (
    <div className="space-y-10">
      {showRoles ? (
        <AccountNotificationForm
          organisationId={organisationId}
          selectedRoles={result.organisation.notification_roles}
          canEdit={canEdit}
        />
      ) : null}
      <NotificationSettingsForm
        scope="account"
        organisationId={organisationId}
        canEdit={canEdit}
        disabledEmails={result.organisation.disabled_notification_emails}
        disabledInApp={result.organisation.disabled_notification_in_app}
        emailIds={ACCOUNT_NOTIFICATION_EMAIL_IDS}
        description="Selling, buying, bidding, and settlement for this business. These switches belong to the business. They change when you switch business. Who can buy, list, and manage people is on Privileges. Invitations and listing-alert channels are on Account Settings → Notifications."
      />
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
    return <p>Business not found.</p>;
  }

  const members = await listMembers(organisationId);
  const canInvite = canAddMember(result.role);
  const invitations = canInvite
    ? await listOrganisationInvitations(organisationId)
    : [];

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-muted">
        Invite people to this business with a role. They must accept from the
        email, while signed in with that address, before they become members.
        Inviting the same email again replaces the pending invitation. What
        each role can do is on{" "}
        <Link href={accountSettingsPath("privileges")} className="underline">
          Privileges
        </Link>
        .
      </p>
      <MemberList
        organisationId={organisationId}
        members={members}
        actorRole={result.role}
        actorEmail={userEmail}
      />
      {canInvite ? (
        <>
          <section>
            <h2 className="text-xl font-semibold text-ink">
              Pending invitations
            </h2>
            <div className="mt-4">
              <OrganisationInvitationList
                organisationId={organisationId}
                invitations={invitations}
                actorRole={result.role}
              />
            </div>
          </section>
          <section className="max-w-md">
            <h2 className="text-xl font-semibold text-ink">Invite person</h2>
            <div className="mt-4">
              <AddMemberForm
                organisationId={organisationId}
                actorRole={result.role}
              />
            </div>
          </section>
        </>
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
    return <p>Business not found.</p>;
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
  const detailsMissing = missingBusinessDetailFields(result.organisation);
  const detailsIncomplete = detailsMissing.length > 0;
  const listingBlocked = Boolean(sellError) || detailsIncomplete;
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
            : "Owners and admins can create and update holdings for this business."}
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
        {canManage && detailsIncomplete ? (
          <div className="mt-4">
            <BusinessDetailsRequiredNotice
              action="list"
              missingLabels={tradeReadyFieldLabels(detailsMissing)}
            />
          </div>
        ) : canManage && sellError ? (
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
                        {listingBlocked ? (
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
    return <p>Business not found.</p>;
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
  const detailsMissing = missingBusinessDetailFields(result.organisation);
  const detailsIncomplete = detailsMissing.length > 0;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Listings
      </h1>
      {canList && detailsIncomplete ? (
        <BusinessDetailsRequiredNotice
          action="list"
          missingLabels={tradeReadyFieldLabels(detailsMissing)}
        />
      ) : canList && sellError ? (
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
              { value: "PUBLISHED", label: "Live" },
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
    return <p>Business not found.</p>;
  }

  const [orders, fisheries, jurisdictions] = await Promise.all([
    listOrganisationOrders(organisationId),
    listFisheries(),
    listJurisdictions(),
  ]);
  const transferApplications = await listTransferApplicationsByOrderIds(
    orders.map((order) => order.id),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Orders</h1>
      <DataTable
        caption="Orders"
        empty="No buys or sells for this business yet."
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
              status: orderStatusLabelFor(
                order,
                transferApplications,
                fisheries,
                jurisdictions,
              ),
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
                showFeeInvoice={order.seller_organisation_id === organisationId}
              />
            }
          />
        ))}
      </DataTable>
    </div>
  );
}
