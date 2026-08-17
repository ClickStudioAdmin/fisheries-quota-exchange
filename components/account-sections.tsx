import Link from "next/link";
import { AddMemberForm } from "@/components/add-member-form";
import { MemberList } from "@/components/member-list";
import {
  PersonProfileForm,
  ProfilePasswordForm,
} from "@/components/person-profile-form";
import { userFullName, userPhone } from "@/lib/auth/display-name";
import type { User } from "@supabase/supabase-js";
import { DataTable, DataTableRowExtras, TableActionRow } from "@/components/data-table";
import { LedgerTable } from "@/components/ledger-table";
import { HoldingForm } from "@/components/holding-form";
import { HoldingActions } from "@/components/holding-actions";
import {
  listFisheries,
  listHoldingCommitments,
  listHoldingsForOrganisation,
  listLedger,
} from "@/lib/fisheries/queries";
import {
  holdingIsVerified,
  holdingVerificationLabel,
  quantityTypeLabel,
} from "@/lib/fisheries/types";
import {
  formatAud,
  listingOfferingLabel,
  listingStatusLabel,
  listingTypeLabel,
} from "@/lib/listings/types";
import { listOrganisationListings } from "@/lib/listings/queries";
import {
  latestSalePriceMap,
  listLatestSalePrices,
} from "@/lib/market/queries";
import { marketValue } from "@/lib/market/types";
import { cancelListingAction } from "@/lib/listings/actions";
import { listOrganisationOrders } from "@/lib/orders/queries";
import { orderStatusLabel } from "@/lib/orders/types";
import { tableSecondaryButtonClassName } from "@/components/auth-card";
import { formatTableDate } from "@/lib/format";
import { accountPath } from "@/lib/organisations/paths";
import { canAddMember, canEditOrganisation } from "@/lib/organisations/permissions";
import { getOrganisation, listMembers } from "@/lib/organisations/queries";

type AccountSectionProps = {
  organisationId: number;
  userEmail: string;
};

export async function AccountProfileSection({
  organisationId,
  user,
}: {
  organisationId: number;
  user: User;
}) {
  const result = await getOrganisation(organisationId);

  if (!result) {
    return <p>Account not found.</p>;
  }

  const canEdit = canEditOrganisation(result.role);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Profile details
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {result.organisation.legal_name} · Your role: {result.role}
        </p>
      </div>
      <section className="max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-ink">Details</h2>
        <PersonProfileForm
          fullName={userFullName(user)}
          email={user.email ?? ""}
          phone={userPhone(user)}
          organisation={result.organisation}
          canEditOrganisation={canEdit}
        />
      </section>
      <section className="max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-ink">Password</h2>
        <ProfilePasswordForm />
      </section>
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Account members
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Add people to this account with a role. They sign in with that email.
          No invitation email is sent yet.
        </p>
      </div>
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
}: {
  organisationId: number;
}) {
  const result = await getOrganisation(organisationId);

  if (!result) {
    return <p>Account not found.</p>;
  }

  const canManage = canEditOrganisation(result.role);
  const [holdings, fisheries, prices] = await Promise.all([
    listHoldingsForOrganisation(organisationId),
    listFisheries(),
    listLatestSalePrices(),
  ]);
  const commitments = await listHoldingCommitments(
    holdings.map((holding) => holding.id),
  );
  const lastSale = latestSalePriceMap(prices);
  const holdingLedgers = await Promise.all(
    holdings.map(async (holding) => ({
      holding,
      entries: await listLedger(holding.id),
    })),
  );
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
          Quota holdings
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {canManage
            ? "Create or update a holding here. Unverified holdings must be approved by a platform admin before you can list or auction them. Changing quantity records an ADJUSTMENT on the ledger."
            : "Owners and admins can create and update holdings for this account."}
        </p>
        {holdings.length > 0 ? (
          <div className="mt-4 border border-line p-4">
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
        caption="Quota holdings"
        empty="No holdings yet."
        searchPlaceholder="Filter holdings…"
        defaultSort={{ key: "fishery", direction: "asc" }}
        columns={[
          { key: "fishery", header: "Fishery", sortable: true, filter: "select" },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          {
            key: "lastSale",
            header: "Last sale",
            sortable: true,
            align: "right",
          },
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
        rows={holdingLedgers.map(({ holding }) => {
          const fishery = fisheries.find((item) => item.id === holding.fishery_id);
          const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "";
          const sale = lastSale.get(holding.fishery_id);
          const value = sale
            ? marketValue(holding.quantity, sale.unit_price_aud)
            : null;

          return {
            id: holding.id,
            values: {
              fishery: fishery?.name ?? "Fishery",
              quantity: holding.quantity,
              lastSale: sale ? Number(sale.unit_price_aud) : "",
              marketValue: value ?? "",
              status: holdingVerificationLabel(holding.verification_status),
            },
            display: {
              quantity: `${holding.quantity} ${unit}`.trim(),
              lastSale: sale
                ? `${formatAud(sale.unit_price_aud)} / ${unit}`
                : "No sales yet",
              marketValue: value != null ? formatAud(value) : "—",
            },
          };
        })}
      >
        {holdingLedgers.map(({ holding, entries }) => {
          const fishery = fisheries.find((item) => item.id === holding.fishery_id);
          const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "units";
          const verified = holdingIsVerified(holding);
          const listed = commitments.get(holding.id) ?? 0;
          const available = Number(holding.quantity) - listed;

          return (
            <DataTableRowExtras
              key={holding.id}
              id={holding.id}
              expandedLabel="Ledger"
              expanded={
                <LedgerTable
                  caption={`Ledger for holding ${holding.id}`}
                  entries={entries}
                />
              }
              actions={
                <div className="space-y-3">
                  <TableActionRow>
                    <Link
                      href={`/fisheries/${holding.fishery_id}`}
                      className="text-sm underline"
                    >
                      View market
                    </Link>
                  </TableActionRow>
                  {canManage ? (
                    <>
                      <HoldingActions
                        holdingId={holding.id}
                        quantity={holding.quantity}
                        unitLabel={unit}
                        minQuantity={String(listed)}
                      />
                      {verified && available > 0 ? (
                        <TableActionRow>
                          <Link
                            href={`/organisations/${organisationId}/listings/new?holding_id=${holding.id}`}
                            className="text-sm underline"
                          >
                            Create listing
                          </Link>
                          <Link
                            href={`/organisations/${organisationId}/auctions/new?holding_id=${holding.id}`}
                            className="text-sm underline"
                          >
                            Create auction
                          </Link>
                        </TableActionRow>
                      ) : verified ? (
                        <p className="text-sm text-ink-muted">
                          All of this holding is listed. Cancel a listing to
                          list more, or increase the holding quantity.
                        </p>
                      ) : (
                        <p className="text-sm text-ink-muted">
                          Waiting for admin verification before listing.
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
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
  const canList = canEditOrganisation(result.role);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Listings
      </h1>
      <DataTable
        caption="Listings"
        empty="No listings yet. Owners and admins can list quota from a holding."
        searchPlaceholder="Filter listings…"
        defaultSort={{ key: "created", direction: "desc" }}
        columns={[
          {
            key: "type",
            header: "Type",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "FIXED_PRICE", label: "Fixed price" },
              { value: "AUCTION", label: "Auction" },
            ],
          },
          { key: "fishery", header: "Fishery", sortable: true, filter: "select" },
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
          { key: "created", header: "Created", sortable: true },
        ]}
        rows={listings.map((listing) => ({
          id: listing.id,
          values: {
            type: listing.listing_type,
            fishery: listing.fishery_name,
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
            created: formatTableDate(listing.created_at),
          },
        }))}
      >
        {listings.map((listing) => (
          <DataTableRowExtras
            key={listing.id}
            id={listing.id}
            actions={
              <TableActionRow>
                <Link
                  href={
                    listing.listing_type === "AUCTION"
                      ? `/auctions/${listing.id}`
                      : `/marketplace/${listing.id}`
                  }
                  className="text-sm underline"
                >
                  View
                </Link>
                {canList &&
                (listing.status === "PENDING_APPROVAL" ||
                  listing.status === "PUBLISHED") ? (
                  <form action={cancelListingAction}>
                    <input type="hidden" name="listing_id" value={listing.id} />
                    <input
                      type="hidden"
                      name="next"
                      value={accountPath(organisationId, "/dashboard/listings")}
                    />
                    <button
                      type="submit"
                      className={tableSecondaryButtonClassName}
                    >
                      Cancel
                    </button>
                  </form>
                ) : null}
              </TableActionRow>
            }
          />
        ))}
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

  const orders = await listOrganisationOrders(organisationId);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Orders</h1>
      <DataTable
        caption="Orders"
        empty="No buys or sells for this account yet."
        searchPlaceholder="Filter orders…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "Order", sortable: true },
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
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "AWAITING_COMPLIANCE", label: "Awaiting compliance" },
              { value: "AWAITING_TRANSFER", label: "Awaiting transfer" },
              { value: "AWAITING_SETTLEMENT", label: "Awaiting settlement" },
              { value: "COMPLETED", label: "Completed" },
              { value: "REJECTED", label: "Rejected" },
              { value: "CANCELLED", label: "Cancelled" },
            ],
          },
          { key: "created", header: "Created", sortable: true },
        ]}
        rows={orders.map((order) => {
          const side =
            order.seller_organisation_id === organisationId
              ? "Selling"
              : "Buying";

          return {
            id: order.id,
            values: {
              id: order.id,
              side,
              offering: order.offering,
              quantity: order.quantity,
              status: order.status,
              created: order.created_at,
            },
            display: {
              offering: order.offering === "SALE" ? "Sale" : "Lease",
              quantity: `${order.quantity} ${order.unit_label}`,
              status: orderStatusLabel(order.status),
              created: formatTableDate(order.created_at),
            },
          };
        })}
      >
        {orders.map((order) => (
          <DataTableRowExtras
            key={order.id}
            id={order.id}
            actions={
              <Link href={`/orders/${order.id}`} className="text-sm underline">
                View
              </Link>
            }
          />
        ))}
      </DataTable>
    </div>
  );
}
