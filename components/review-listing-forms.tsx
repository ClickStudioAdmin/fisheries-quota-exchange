import {
  fieldClassName,
  tableButtonClassName,
} from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  approveListingAction,
  rejectListingAction,
} from "@/lib/listings/actions";

export function ReviewListingForms({
  listingId,
  reviewQueue = [],
  canApprove = false,
  isAuction = false,
}: {
  listingId: number;
  reviewQueue?: number[];
  canApprove?: boolean;
  isAuction?: boolean;
}) {
  const remaining = reviewQueue.filter((id) => id !== listingId);
  const approveFormId = `approve-listing-${listingId}`;
  const offering = isAuction ? "auction" : "listing";

  return (
    <div className="space-y-6">
      <form id={approveFormId} action={approveListingAction} className="space-y-3">
        <input type="hidden" name="listing_id" value={listingId} />
        {remaining.map((id) => (
          <input key={id} type="hidden" name="review_queue" value={id} />
        ))}
        <h4 className="text-sm font-semibold text-ink">Approve</h4>
        <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
          <li>
            Publishes this {offering} on the marketplace. It does not move
            quota.
          </li>
          <li>Emails the seller that it is live.</li>
          <li>
            People with alerts for this fishery also get a listing alert.
          </li>
          <li>The optional note is stored on the {offering}. It is not emailed.</li>
        </ul>
        {!canApprove ? (
          <p className="text-sm text-ink-muted">
            Save all approval checks above before you can approve this listing.
          </p>
        ) : null}
        <div>
          <label
            htmlFor={`approve-note-${listingId}`}
            className="block text-sm text-ink"
          >
            Note (optional)
          </label>
          <textarea
            id={`approve-note-${listingId}`}
            name="review_note"
            rows={3}
            className={fieldClassName}
          />
        </div>
        <PendingSubmitButton
          className={tableButtonClassName}
          pendingLabel="Approving…"
          disabled={!canApprove}
        >
          Approve
        </PendingSubmitButton>
      </form>
      <form action={rejectListingAction} className="space-y-3">
        <input type="hidden" name="listing_id" value={listingId} />
        {remaining.map((id) => (
          <input key={id} type="hidden" name="review_queue" value={id} />
        ))}
        <h4 className="text-sm font-semibold text-ink">Reject</h4>
        <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
          <li>Does not publish this {offering}.</li>
          <li>Emails the seller. There is no buyer yet.</li>
          <li>If you add a reason, the seller receives that text.</li>
          <li>Does not move quota.</li>
        </ul>
        <div>
          <label
            htmlFor={`reject-note-${listingId}`}
            className="block text-sm text-ink"
          >
            Reason (optional)
          </label>
          <textarea
            id={`reject-note-${listingId}`}
            name="review_note"
            rows={3}
            className={fieldClassName}
          />
        </div>
        <PendingSubmitButton
          className={tableButtonClassName}
          pendingLabel="Rejecting…"
        >
          Reject
        </PendingSubmitButton>
      </form>
    </div>
  );
}
