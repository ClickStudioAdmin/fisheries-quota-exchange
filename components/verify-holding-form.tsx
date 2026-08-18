import { tableButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { verifyHoldingAction } from "@/lib/fisheries/actions";

export function VerifyHoldingForm({
  holdingId,
  reviewQueue = [],
}: {
  holdingId: number;
  reviewQueue?: number[];
}) {
  const remaining = reviewQueue.filter((id) => id !== holdingId);

  return (
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
  );
}
