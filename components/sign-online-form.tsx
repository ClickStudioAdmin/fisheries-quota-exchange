"use client";

import { useActionState } from "react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  createPandaDocSigningSessionAction,
  type SignOnlineState,
} from "@/lib/transfers/actions";

const initialState: SignOnlineState = {};

const signOnlineBoxClassName =
  "group flex w-full min-w-0 max-w-lg items-center gap-3 border border-line bg-paper px-3 py-3 text-left hover:border-sea disabled:opacity-60";

export function SignOnlineForm({ orderId }: { orderId: number }) {
  const [state, formAction, pending] = useActionState(
    createPandaDocSigningSessionAction,
    initialState,
  );

  return (
    <div className="space-y-3">
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
        <form action={formAction} className="max-w-lg">
          <input type="hidden" name="order_id" value={orderId} />
          <PendingSubmitButton
            className={signOnlineBoxClassName}
            pendingLabel="Opening…"
            disabled={pending}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-sea/15 text-sea">
              <SignatureIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">
                Sign Online
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-muted">
                Open the application with your witness present
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sea">
              Open
              <OpenArrow className="h-3.5 w-3.5" />
            </span>
          </PendingSubmitButton>
        </form>
      )}
    </div>
  );
}

function SignatureIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 17c2.5-1 4.2-4.2 6-4.2 1.3 0 2.1 1.1 3.2 1.1 1.8 0 2.8-2.4 4.8-2.4 1.4 0 2.6.9 4 2.5" />
      <path d="M14 20l6.5-6.5a1.8 1.8 0 0 0 0-2.5L18 8.5a1.8 1.8 0 0 0-2.5 0L9 15v5h5z" />
    </svg>
  );
}

function OpenArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h8" />
      <path d="M8 4l4 4-4 4" />
    </svg>
  );
}
