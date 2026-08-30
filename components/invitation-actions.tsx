"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  acceptInvitationAction,
  cancelInvitationAction,
  declineInvitationAction,
  type MemberActionState,
} from "@/lib/organisations/actions";
import {
  buttonClassName,
  tableButtonClassName,
} from "@/components/auth-card";

const initialState: MemberActionState = {};

export function CancelInvitationButton({
  organisationId,
  invitationId,
  invitedRole,
}: {
  organisationId: number;
  invitationId: number;
  invitedRole: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    cancelInvitationAction,
    initialState,
  );

  useEffect(() => {
    if (state.message) {
      router.refresh();
    }
  }, [state.message, router]);

  return (
    <form action={action}>
      <input type="hidden" name="organisation_id" value={String(organisationId)} />
      <input type="hidden" name="invitation_id" value={String(invitationId)} />
      <input type="hidden" name="invited_role" value={invitedRole} />
      {state.error ? (
        <p className="mb-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={tableButtonClassName} disabled={pending}>
        {pending ? "Cancelling…" : "Cancel"}
      </button>
    </form>
  );
}

export function InvitationDecisionForms({
  token,
  acceptLabel = "Accept invitation",
  declineLabel = "Decline",
}: {
  token: string;
  acceptLabel?: string;
  declineLabel?: string;
}) {
  const router = useRouter();
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptInvitationAction,
    initialState,
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineInvitationAction,
    initialState,
  );

  useEffect(() => {
    if (declineState.message) {
      router.refresh();
    }
  }, [declineState.message, router]);

  const error = acceptState.error || declineState.error;
  const pending = acceptPending || declinePending;

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {declineState.message ? (
        <p className="text-sm text-sea" role="status">
          {declineState.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={buttonClassName} disabled={pending}>
            {acceptPending ? "Accepting…" : acceptLabel}
          </button>
        </form>
        <form action={declineAction}>
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className={tableButtonClassName}
            disabled={pending}
          >
            {declinePending ? "Declining…" : declineLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
