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
}: {
  listingId: number;
  reviewQueue?: number[];
}) {
  const remaining = reviewQueue.filter((id) => id !== listingId);
  const approveFormId = `approve-listing-${listingId}`;

  return (
    <div className="space-y-4">
      <form id={approveFormId} action={approveListingAction}>
        <input type="hidden" name="listing_id" value={listingId} />
        {remaining.map((id) => (
          <input key={id} type="hidden" name="review_queue" value={id} />
        ))}
        <PendingSubmitButton
          className={tableButtonClassName}
          pendingLabel="Approving…"
        >
          Approve
        </PendingSubmitButton>
      </form>
      <form action={rejectListingAction} className="space-y-3">
        <input type="hidden" name="listing_id" value={listingId} />
        {remaining.map((id) => (
          <input key={id} type="hidden" name="review_queue" value={id} />
        ))}
        <div>
          <label
            htmlFor={`reject-note-${listingId}`}
            className="block text-sm text-ink"
          >
            Reason (optional)
          </label>
          <input
            id={`reject-note-${listingId}`}
            name="review_note"
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
      <div>
        <label
          htmlFor={`approve-note-${listingId}`}
          className="block text-sm text-ink"
        >
          Note (optional)
        </label>
        <input
          id={`approve-note-${listingId}`}
          name="review_note"
          form={approveFormId}
          className={fieldClassName}
        />
      </div>
    </div>
  );
}
