import { redirect } from "next/navigation";
import {
  approveListingAction,
  rejectListingAction,
} from "@/lib/listings/actions";
import { listAllListings } from "@/lib/listings/queries";
import { formatAud } from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { buttonClassName, fieldClassName } from "@/components/auth-card";

export const metadata = {
  title: "Listings",
};

export default async function AdminListingsPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const listings = await listAllListings();
  const pending = listings.filter((item) => item.status === "PENDING_APPROVAL");
  const others = listings.filter((item) => item.status !== "PENDING_APPROVAL");

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Listing approval
      </h1>
      <section>
        <h2 className="text-xl font-semibold text-ink">Waiting for approval</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No pending listings.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {pending.map((listing) => (
              <div key={listing.id} className="border border-line p-4">
                <p className="font-medium text-ink">
                  {listing.seller_name} · {listing.fishery_name} ·{" "}
                  {listing.stock_name}
                </p>
                <p className="text-sm text-ink-muted">
                  {listing.offering} · {listing.quantity} {listing.unit_label} ·{" "}
                  {formatAud(listing.unit_price_aud)} / {listing.unit_label}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <form action={approveListingAction} className="flex gap-2">
                    <input type="hidden" name="listing_id" value={listing.id} />
                    <input
                      name="review_note"
                      placeholder="Note (optional)"
                      className={fieldClassName}
                    />
                    <button type="submit" className={buttonClassName}>
                      Approve
                    </button>
                  </form>
                  <form action={rejectListingAction} className="flex gap-2">
                    <input type="hidden" name="listing_id" value={listing.id} />
                    <input
                      name="review_note"
                      placeholder="Reason (optional)"
                      className={fieldClassName}
                    />
                    <button
                      type="submit"
                      className="border border-line px-4 py-2 text-sm text-ink hover:bg-paper-raised"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">Other listings</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          {others.map((listing) => (
            <li key={listing.id}>
              {listing.status} · {listing.seller_name} · {listing.fishery_name} ·{" "}
              {listing.quantity} {listing.unit_label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
