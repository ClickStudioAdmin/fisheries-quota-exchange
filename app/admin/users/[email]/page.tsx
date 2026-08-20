import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { OrderTableDownloads, OrderTableLinks } from "@/components/order-table-links";
import { tableButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { LabeledFields } from "@/components/surface";
import { isPlatformAdmin } from "@/lib/admin/access";
import { setUserVerifiedAction } from "@/lib/admin/actions";
import { verifyHoldingAction } from "@/lib/fisheries/actions";
import {
  listFisheries,
  listHoldingsForOrganisations,
  listJurisdictions,
} from "@/lib/fisheries/queries";
import {
  fisherySelectLabel,
  fisherySelectLabelForName,
  holdingIsVerified,
  holdingVerificationLabel,
  quantityTypeLabel,
} from "@/lib/fisheries/types";
import { formatTableDate } from "@/lib/format";
import { listListingsByCreator } from "@/lib/listings/queries";
import {
  formatAud,
  listingHref,
  listingOfferingLabel,
  listingStatusLabel,
  listingTypeLabel,
} from "@/lib/listings/types";
import { listOrdersByCreator } from "@/lib/orders/queries";
import { orderStatusLabelFor } from "@/lib/transfers/display";
import { listTransferApplicationsByOrderIds } from "@/lib/transfers/queries";
import {
  adminUserDisplayName,
  adminUserRole,
  getAdminUserForAdmin,
} from "@/lib/organisations/admin-queries";
import { parseAdminUserEmailParam, adminHoldingPath } from "@/lib/organisations/paths";
import { organisationRoleLabel } from "@/lib/organisations/types";

type AdminUserPageProps = {
  params: Promise<{ email: string }>;
};

export async function generateMetadata({
  params,
}: AdminUserPageProps): Promise<Metadata> {
  const { email: raw } = await params;
  const email = parseAdminUserEmailParam(raw);

  if (!email) {
    return { title: "User" };
  }

  const profile = await getAdminUserForAdmin(email);
  return { title: profile ? adminUserDisplayName(profile) : email };
}

export default async function AdminUserPage({ params }: AdminUserPageProps) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const { email: raw } = await params;
  const email = parseAdminUserEmailParam(raw);

  if (!email) {
    notFound();
  }

  const profile = await getAdminUserForAdmin(email);

  if (!profile) {
    notFound();
  }

  const organisationIds = profile.memberships.map(
    (membership) => membership.organisationId,
  );
  const [holdings, listings, orders, fisheries, jurisdictions] = await Promise.all([
    listHoldingsForOrganisations(organisationIds),
    listListingsByCreator(profile.email),
    listOrdersByCreator(profile.email),
    listFisheries(),
    listJurisdictions(),
  ]);
  const transferApplications = await listTransferApplicationsByOrderIds(
    orders.map((order) => order.id),
  );
  const role = adminUserRole(profile);
  const organisations = new Map(
    profile.memberships.map((membership) => [
      membership.organisationId,
      membership.organisation,
    ]),
  );
  const name = adminUserDisplayName(profile);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-ink-muted">
          <Link href="/admin/users" className="underline">
            Users
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {name}
            </h1>
            {profile.fullName ? (
              <p className="mt-1 text-sm text-ink-muted">{profile.email}</p>
            ) : null}
          </div>
          <form action={setUserVerifiedAction}>
            <input type="hidden" name="email" value={profile.email} />
            <input
              type="hidden"
              name="verified"
              value={profile.verified ? "false" : "true"}
            />
            <PendingSubmitButton
              className={tableButtonClassName}
              pendingLabel="Updating…"
            >
              {profile.verified ? "Revoke verification" : "Mark as verified"}
            </PendingSubmitButton>
          </form>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Details</h2>
        <LabeledFields
          columns={4}
          items={[
            {
              label: "Name",
              value: profile.fullName ?? "—",
            },
            {
              label: "Email",
              value: profile.email,
            },
            {
              label: "Phone",
              value: profile.phone ?? "—",
            },
            {
              label: "Role",
              value: role ? organisationRoleLabel(role) : "—",
            },
            {
              label: "Access",
              value: profile.platformAdmin ? "Platform admin" : "User",
            },
            {
              label: "Verified",
              value: profile.verified
                ? [
                    "Yes",
                    profile.verifiedAt
                      ? formatTableDate(profile.verifiedAt)
                      : null,
                    profile.verifiedBy ? `by ${profile.verifiedBy}` : null,
                  ]
                    .filter(Boolean)
                    .join(" ")
                : "No",
            },
            {
              label: "Joined",
              value: profile.joinedAt
                ? formatTableDate(profile.joinedAt)
                : "—",
            },
            {
              label: "Activity",
              value: `${holdings.length} holdings · ${listings.length} listings · ${orders.length} orders`,
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Businesses</h2>
        <DataTable
          caption="Businesses"
        empty="No business memberships."
        searchPlaceholder="Filter businesses…"
        defaultSort={{ key: "account", direction: "asc" }}
        columns={[
          { key: "account", header: "Business", sortable: true },
          {
            key: "role",
            header: "Role",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "OWNER", label: "Owner" },
              { value: "ADMIN", label: "Admin" },
              { value: "MEMBER", label: "Member" },
            ],
          },
          { key: "joined", header: "Joined", sortable: true },
        ]}
        rows={profile.memberships.map((membership) => ({
          id: membership.organisationId,
          values: {
            account: membership.organisation,
            role: membership.role,
            joined: membership.joinedAt ?? "",
          },
          display: {
            role: organisationRoleLabel(membership.role),
            joined: membership.joinedAt
              ? formatTableDate(membership.joinedAt)
              : "—",
          },
        }))}
      />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Holdings</h2>
        <DataTable
          caption="Holdings"
        empty="No holdings in this person’s businesses."
        searchPlaceholder="Filter holdings…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "ID", sortable: true },
          {
            key: "organisation",
            header: "Business",
            sortable: true,
            filter: "select",
          },
          { key: "fishery", header: "Fishery", sortable: true, filter: "select" },
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
        rows={holdings.map((holding) => {
          const fishery = fisheries.find((item) => item.id === holding.fishery_id);
          const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "";

          return {
            id: holding.id,
            needsAction: !holdingIsVerified(holding),
            values: {
              id: holding.id,
              organisation:
                organisations.get(holding.organisation_id) ?? "Business",
              fishery: fishery
                ? fisherySelectLabel(fishery, jurisdictions)
                : "Fishery",
              quantity: holding.quantity,
              status: holdingVerificationLabel(holding.verification_status),
            },
            display: {
              quantity: `${holding.quantity} ${unit}`.trim(),
            },
          };
        })}
      >
        {holdings.map((holding) => (
          <DataTableRowExtras
            key={holding.id}
            id={holding.id}
            links={
              <Link
                href={adminHoldingPath(holding.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={tableLinkClassName}
              >
                Details
              </Link>
            }
            actions={
              holdingIsVerified(holding) ? null : (
                <form action={verifyHoldingAction}>
                  <input
                    type="hidden"
                    name="holding_id"
                    value={String(holding.id)}
                  />
                  <PendingSubmitButton
                    className={tableButtonClassName}
                    pendingLabel="Verifying…"
                  >
                    Verify holding
                  </PendingSubmitButton>
                </form>
              )
            }
          />
        ))}
      </DataTable>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Listings</h2>
        <DataTable
          caption="Listings"
        empty="No listings created by this person."
        searchPlaceholder="Filter listings…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "ID", sortable: true, details: true, nowrap: true },
          { key: "seller", header: "Seller", sortable: true, filter: "select" },
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
          needsAction: listing.status === "PENDING_APPROVAL",
          details: [
            { label: "Created", value: formatTableDate(listing.created_at) },
          ],
          values: {
            id: listing.id,
            seller: listing.seller_name,
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
        {listings.map((listing) => (
          <DataTableRowExtras
            key={listing.id}
            id={listing.id}
            links={
              <Link
                href={listingHref(listing)}
                target="_blank"
                rel="noopener noreferrer"
                className={tableLinkClassName}
              >
                View
              </Link>
            }
          />
        ))}
      </DataTable>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Orders</h2>
        <DataTable
          caption="Orders"
        empty="No orders created by this person."
        searchPlaceholder="Filter orders…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "ID", sortable: true, details: true, nowrap: true },
          {
            key: "parties",
            header: "Buyer / seller",
            stacked: [
              { key: "buyer", label: "Buyer", filter: "select" },
              { key: "seller", label: "Seller", filter: "select" },
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
            key: "amount",
            header: "Amount",
            sortable: true,
            align: "right",
            stacked: [
              { key: "amount", label: "Amount" },
              { key: "fee", label: "Fee" },
            ],
          },
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
        rows={orders.map((order) => ({
          id: order.id,
          needsAction:
            order.status === "AWAITING_COMPLIANCE" ||
            order.status === "AWAITING_TRANSFER" ||
            order.status === "AWAITING_SETTLEMENT",
          details: [
            { label: "Created", value: formatTableDate(order.created_at) },
          ],
          values: {
            id: order.id,
            parties: `${order.buyer_name} ${order.seller_name}`,
            buyer: order.buyer_name,
            seller: order.seller_name,
            fishery: fisherySelectLabelForName(
              order.fishery_name,
              fisheries,
              jurisdictions,
            ),
            offering: order.offering,
            quantity: order.quantity,
            amount: order.amount_aud,
            fee: order.fee_amount_aud,
            status: order.status,
            created: order.created_at,
          },
          display: {
            offering: listingOfferingLabel(order.offering),
            quantity: `${order.quantity} ${order.unit_label}`,
            amount: formatAud(order.amount_aud),
            fee:
              Number(order.fee_percent) > 0
                ? `${formatAud(order.fee_amount_aud)} (${order.fee_percent}%)`
                : formatAud(order.fee_amount_aud),
            status: orderStatusLabelFor(
              order,
              transferApplications,
              fisheries,
              jurisdictions,
            ),
          },
        }))}
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
      </section>
    </div>
  );
}
