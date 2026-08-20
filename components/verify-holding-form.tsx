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
  canApprove = false,
}: {
  holdingId: number;
  reviewQueue?: number[];
  withRequestChanges?: boolean;
  canApprove?: boolean;
}) {
  const remaining = reviewQueue.filter((id) => id !== holdingId);
  const noteId = `holding-changes-${holdingId}`;

  return (
    <div className="space-y-6">
      <form action={verifyHoldingAction} className="space-y-3">
        <input type="hidden" name="holding_id" value={String(holdingId)} />
        {reviewQueue.length > 0 ? (
          <input type="hidden" name="from_queue" value="1" />
        ) : null}
        {remaining.map((id) => (
          <input key={id} type="hidden" name="review_queue" value={id} />
        ))}
        <h4 className="text-sm font-semibold text-ink">Verify holding</h4>
        <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
          <li>Marks this holding as verified so the business can list or auction it.</li>
          <li>Emails the holding business that it is verified.</li>
          <li>Does not move quota. Quantity stays as recorded on the ledger.</li>
        </ul>
        {!canApprove ? (
          <p className="text-sm text-ink-muted">
            Save all verification checks above before you can verify this
            holding.
          </p>
        ) : null}
        <PendingSubmitButton
          className={tableButtonClassName}
          pendingLabel="Verifying…"
          disabled={!canApprove}
        >
          Verify holding
        </PendingSubmitButton>
      </form>
      {withRequestChanges ? (
        <form action={requestHoldingChangesAction} className="space-y-3">
          <input type="hidden" name="holding_id" value={String(holdingId)} />
          <h4 className="text-sm font-semibold text-ink">Request changes</h4>
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
            <li>The holding stays pending verification. It is not verified.</li>
            <li>Emails the holding business with your message.</li>
            <li>Does not move quota.</li>
          </ul>
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
