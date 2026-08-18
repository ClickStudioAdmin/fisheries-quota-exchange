import {
  fieldClassName,
  tableButtonClassName,
} from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  requestHoldingChangesAction,
  verifyHoldingAction,
} from "@/lib/fisheries/actions";

export function VerifyHoldingForm({
  holdingId,
  reviewQueue = [],
  withRequestChanges = false,
}: {
  holdingId: number;
  reviewQueue?: number[];
  withRequestChanges?: boolean;
}) {
  const remaining = reviewQueue.filter((id) => id !== holdingId);
  const noteId = `holding-changes-${holdingId}`;

  return (
    <div className="space-y-4">
      <form action={verifyHoldingAction}>
        <input type="hidden" name="holding_id" value={String(holdingId)} />
        {reviewQueue.length > 0 ? (
          <input type="hidden" name="from_queue" value="1" />
        ) : null}
        {remaining.map((id) => (
          <input key={id} type="hidden" name="review_queue" value={id} />
        ))}
        <PendingSubmitButton
          className={tableButtonClassName}
          pendingLabel="Verifying…"
        >
          Verify holding
        </PendingSubmitButton>
      </form>
      {withRequestChanges ? (
        <form action={requestHoldingChangesAction} className="space-y-3">
          <input type="hidden" name="holding_id" value={String(holdingId)} />
          <div>
            <label htmlFor={noteId} className="block text-sm text-ink">
              Changes needed
            </label>
            <textarea
              id={noteId}
              name="review_note"
              required
              rows={3}
              className={fieldClassName}
            />
          </div>
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Sending…"
          >
            Request changes
          </PendingSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
