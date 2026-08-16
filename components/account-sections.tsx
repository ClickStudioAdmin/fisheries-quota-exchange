import Link from "next/link";
import { AddMemberForm } from "@/components/add-member-form";
import { MemberList } from "@/components/member-list";
import { OrganisationProfileForm } from "@/components/organisation-profile-form";
import { DataTable, DataTableRowExtras, TableActionRow } from "@/components/data-table";
import { LedgerTable } from "@/components/ledger-table";
import { formatTableDate } from "@/lib/format";
import { canAddMember, canEditOrganisation } from "@/lib/organisations/permissions";
import { getOrganisation, listMembers } from "@/lib/organisations/queries";
import { accountPath } from "@/lib/organisations/paths";
import {
  listAllQuotaTypes,
  listAllSeasons,
  listAllStocks,
  listHoldingsForOrganisation,
  listLedger,
} from "@/lib/fisheries/queries";
import { listOrganisationListings } from "@/lib/listings/queries";
import {
  formatAud,
  listingOfferingLabel,
  listingStatusLabel,
  listingTypeLabel,
} from "@/lib/listings/types";
import { cancelListingAction } from "@/lib/listings/actions";
import { listOrganisationOrders } from "@/lib/orders/queries";
import { orderStatusLabel } from "@/lib/orders/types";
import { tableSecondaryButtonClassName } from "@/components/auth-card";

type AccountSectionProps = {
  organisationId: number;
  userEmail: string;
};

export async function AccountProfileSection({
  organisationId,
}: {
  organisationId: number;
}) {
  const result = await getOrganisation(organisationId);

  if (!result) {
    return <p>Account not found.</p>;
  }

  const canEdit = canEditOrganisation(result.role);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Profile details
      </h1>
      <p className="text-sm text-ink-muted">
        {result.organisation.legal_name} · Your role: {result.role}
      </p>
      <div className="max-w-md">
        <OrganisationProfileForm
          organisation={result.organisation}
          canEdit={canEdit}
        />
      </div>
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

  const canList = canEditOrganisation(result.role);
  const [holdings, stocks, seasons, quotaTypes] = await Promise.all([
    listHoldingsForOrganisation(organisationId),
    listAllStocks(),
    listAllSeasons(),
    listAllQuotaTypes(),
  ]);
  const holdingLedgers = await Promise.all(
    holdings.map(async (holding) => ({
      holding,
      entries: await listLedger(holding.id),
    })),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Quota holdings
      </h1>
      <DataTable
        caption="Quota holdings"
        empty="No holdings yet. A platform admin can create a test holding."
        searchPlaceholder="Filter holdings…"
        defaultSort={{ key: "stock", direction: "asc" }}
        columns={[
          { key: "stock", header: "Stock", sortable: true, filter: "select" },
          { key: "season", header: "Season", sortable: true, filter: "select" },
          { key: "quotaType", header: "Quota type", sortable: true },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
        ]}
        rows={holdingLedgers.map(({ holding }) => {
          const stock = stocks.find((item) => item.id === holding.stock_id);
          const season = seasons.find((item) => item.id === holding.season_id);
          const quotaType = quotaTypes.find(
            (item) => item.id === holding.quota_type_id,
          );

          return {
            id: holding.id,
            values: {
              stock: stock?.name ?? "Stock",
              season: season?.name ?? "Season",
              quotaType: quotaType
                ? `${quotaType.name} (${quotaType.measurement_kind})`
                : "Quota type",
              quantity: holding.quantity,
            },
            display: {
              quantity: `${holding.quantity} ${quotaType?.unit_label ?? ""}`.trim(),
            },
          };
        })}
      >
        {holdingLedgers.map(({ holding, entries }) => (
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
              canList ? (
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
              ) : null
            }
          />
        ))}
      </DataTable>
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
