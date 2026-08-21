"use client";

import { useActionState } from "react";
import { tableButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  createPandaDocSigningSessionAction,
  type SignOnlineState,
} from "@/lib/transfers/actions";

const initialState: SignOnlineState = {};

export function SignOnlineForm({ orderId }: { orderId: number }) {
  const [state, formAction, pending] = useActionState(
    createPandaDocSigningSessionAction,
    initialState,
  );

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-ink-muted">
        Your witness must be physically present and complete the witness block
        before you finish. A PandaDoc field is not itself a witness. Completing
        this screen does not update FQX until PandaDoc confirms the signature.
      </p>
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.signingUrl ? (
        <iframe
          title="Sign Online"
          src={state.signingUrl}
          className="h-[720px] w-full border border-line bg-paper-raised"
        />
      ) : (
        <form action={formAction}>
          <input type="hidden" name="order_id" value={orderId} />
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Opening…"
            disabled={pending}
          >
            Sign Online
          </PendingSubmitButton>
        </form>
      )}
    </div>
  );
}
