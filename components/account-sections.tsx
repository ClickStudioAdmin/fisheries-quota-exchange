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
import { AdminCreateForm } from "@/components/admin-create-form";
import { HoldingActions } from "@/components/holding-actions";
import { formatTableDate } from "@/lib/format";
import { canAddMember, canEditOrganisation } from "@/lib/organisations/permissions";
import { getOrganisation, listMembers } from "@/lib/organisations/queries";
import { accountPath } from "@/lib/organisations/paths";
import { createHoldingAction } from "@/lib/fisheries/actions";
import {
  listAllQuotaTypes,
  listAllSeasons,
  listAllStocks,
  listFisheries,
  listHoldingsForOrganisation,
  listLedger,
} from "@/lib/fisheries/queries";
import {
  holdingIsVerified,
  holdingVerificationLabel,
} from "@/lib/fisheries/types";
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
  const [holdings, fisheries, stocks, seasons, quotaTypes] = await Promise.all([
    listHoldingsForOrganisation(organisationId),
    listFisheries(),
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

  function fisheryName(fisheryId: number) {
    return fisheries.find((item) => item.id === fisheryId)?.name ?? "Fishery";
  }

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
      </div>
      <DataTable
        caption="Quota holdings"
        empty="No holdings yet."
        searchPlaceholder="Filter holdings…"
        defaultSort={{ key: "stock", direction: "asc" }}
        columns={[
          { key: "stock", header: "Stock", sortable: true, filter: "select" },
          { key: "season", header: "Season", sortable: true, filter: "select" },
          { key: "quotaType", header: "Quota type", sortable: true },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
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
              status: holdingVerificationLabel(holding.verification_status),
            },
            display: {
              quantity: `${holding.quantity} ${quotaType?.unit_label ?? ""}`.trim(),
            },
          };
        })}
      >
        {holdingLedgers.map(({ holding, entries }) => {
          const quotaType = quotaTypes.find(
            (item) => item.id === holding.quota_type_id,
          );
          const verified = holdingIsVerified(holding);

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
                canManage ? (
                  <div className="space-y-3">
                    <HoldingActions
                      holdingId={holding.id}
                      quantity={holding.quantity}
                      unitLabel={quotaType?.unit_label ?? "units"}
                    />
                    {verified ? (
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
                    ) : (
                      <p className="text-sm text-ink-muted">
                        Waiting for admin verification before listing.
                      </p>
                    )}
                  </div>
                ) : null
              }
            />
          );
        })}
      </DataTable>
      {canManage ? (
        <div className="max-w-md">
          <h2 className="text-xl font-semibold text-ink">Add holding</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Stock, season and quota type must belong to the same fishery.
          </p>
          <div className="mt-4">
            <AdminCreateForm
              action={createHoldingAction}
              hidden={{ organisation_id: organisationId }}
              submitLabel="Add holding"
              fields={[
                {
                  name: "stock_id",
                  label: "Stock",
                  type: "select",
                  required: true,
                  options: stocks.map((item) => ({
                    value: String(item.id),
                    label: `${fisheryName(item.fishery_id)} · ${item.name}`,
                  })),
                },
                {
                  name: "season_id",
                  label: "Season",
                  type: "select",
                  required: true,
                  options: seasons.map((item) => ({
                    value: String(item.id),
                    label: `${fisheryName(item.fishery_id)} · ${item.name}`,
                  })),
                },
                {
                  name: "quota_type_id",
                  label: "Quota type",
                  type: "select",
                  required: true,
                  options: quotaTypes.map((item) => ({
                    value: String(item.id),
                    label: `${fisheryName(item.fishery_id)} · ${item.name} (${item.unit_label})`,
                  })),
                },
                {
                  name: "quantity",
                  label: "Quantity",
                  type: "number",
                  required: true,
                },
                { name: "note", label: "Note" },
              ]}
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
