import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { tableButtonClassName, tableSecondaryButtonClassName } from "@/components/auth-card";
import { LabeledFields } from "@/components/surface";
import { isPlatformAdmin } from "@/lib/admin/access";
import { setUserVerifiedAction } from "@/lib/admin/actions";
import { verifyHoldingAction } from "@/lib/fisheries/actions";
import {
  listFisheries,
  listHoldingsForOrganisations,
} from "@/lib/fisheries/queries";
import {
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
import { orderStatusLabel } from "@/lib/orders/types";
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
  const [holdings, listings, orders, fisheries] = await Promise.all([
    listHoldingsForOrganisations(organisationIds),
    listListingsByCreator(profile.email),
    listOrdersByCreator(profile.email),
    listFisheries(),
  ]);
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
            <button
              type="submit"
              className={
                profile.verified
                  ? tableSecondaryButtonClassName
                  : tableButtonClassName
              }
            >
              {profile.verified ? "Revoke verification" : "Mark as verified"}
            </button>
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
        <h2 className="text-xl font-semibold text-ink">Accounts</h2>
        <DataTable
          caption="Accounts"
        empty="No account memberships."
        searchPlaceholder="Filter accounts…"
        defaultSort={{ key: "account", direction: "asc" }}
        columns={[
          { key: "account", header: "Account", sortable: true },
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
        empty="No holdings in this person’s accounts."
        searchPlaceholder="Filter holdings…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "ID", sortable: true },
          {
            key: "organisation",
            header: "Account",
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
                organisations.get(holding.organisation_id) ?? "Account",
              fishery: fishery?.name ?? "Fishery",
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
                  <button type="submit" className={tableButtonClassName}>
                    Verify holding
                  </button>
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
        defaultSort={{ key: "created", direction: "desc" }}
        columns={[
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
          { key: "fishery", header: "Fishery", sortable: true, filter: "select" },
          {
            key: "offering",
            header: "Type",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "SALE", label: "Sale" },
              { value: "LEASE", label: "Lease" },
            ],
          },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          { key: "price", header: "Price", sortable: true, align: "right" },
          { key: "created", header: "Created", sortable: true },
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
          needsAction: listing.status === "PENDING_APPROVAL",
          values: {
            seller: listing.seller_name,
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
            links={
              <Link href={listingHref(listing)} className={tableLinkClassName}>
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
          { key: "id", header: "Order", sortable: true },
          { key: "buyer", header: "Buyer", sortable: true, filter: "select" },
          { key: "seller", header: "Seller", sortable: true, filter: "select" },
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
          { key: "amount", header: "Amount", sortable: true, align: "right" },
          { key: "created", header: "Created", sortable: true },
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
        ]}
        rows={orders.map((order) => ({
          id: order.id,
          needsAction:
            order.status === "AWAITING_COMPLIANCE" ||
            order.status === "AWAITING_TRANSFER" ||
            order.status === "AWAITING_SETTLEMENT",
          values: {
            id: order.id,
            buyer: order.buyer_name,
            seller: order.seller_name,
            offering: order.offering,
            quantity: order.quantity,
            amount: order.amount_aud,
            status: order.status,
            created: order.created_at,
          },
          display: {
            offering: listingOfferingLabel(order.offering),
            quantity: `${order.quantity} ${order.unit_label}`,
            amount: formatAud(order.amount_aud),
            status: orderStatusLabel(order.status),
            created: formatTableDate(order.created_at),
          },
        }))}
      >
        {orders.map((order) => (
          <DataTableRowExtras
            key={order.id}
            id={order.id}
            links={
              <Link href={`/orders/${order.id}`} className={tableLinkClassName}>
                View
              </Link>
            }
          />
        ))}
      </DataTable>
      </section>
    </div>
  );
}
