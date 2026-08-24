"use client";

import { useActionState } from "react";
import {
  cancelCustodyReleaseAction,
  completeCustodyReleaseAction,
  type AdminFormState,
} from "@/lib/fisheries/actions";
import { fieldClassName, tableButtonClassName, tableSecondaryButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { panelClassName } from "@/components/surface";
import type { CustodyReleaseRequest } from "@/lib/fisheries/types";
import { custodyReleaseStatusLabel } from "@/lib/fisheries/types";
import { formatTableDateTime } from "@/lib/format";

const initialState: AdminFormState = {};

function CompleteReleaseForm({ requestId }: { requestId: number }) {
  const [state, formAction, pending] = useActionState(
    completeCustodyReleaseAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-3 space-y-3">
      <input type="hidden" name="request_id" value={requestId} />
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-sea" role="status">
          {state.message}
        </p>
      ) : null}
      <div>
        <label
          htmlFor={`fishnet-ref-${requestId}`}
          className="block text-sm text-ink"
        >
          FishNet reference
        </label>
        <input
          id={`fishnet-ref-${requestId}`}
          name="fishnet_reference"
          required
          className={fieldClassName}
        />
      </div>
      <div>
        <label
          htmlFor={`release-notes-${requestId}`}
          className="block text-sm text-ink"
        >
          Admin notes
        </label>
        <textarea
          id={`release-notes-${requestId}`}
          name="admin_notes"
          rows={2}
          className={fieldClassName}
        />
      </div>
      <PendingSubmitButton
        className={tableButtonClassName}
        pendingLabel="Completing…"
        disabled={pending}
      >
        Mark release completed
      </PendingSubmitButton>
    </form>
  );
}

export function CustodyReleaseAdminPanel({
  requests,
  unitLabel,
}: {
  requests: CustodyReleaseRequest[];
  unitLabel: string;
}) {
  const pending = requests.filter((item) => item.status === "PENDING");

  if (requests.length === 0) {
    return null;
  }

  return (
    <section className={panelClassName}>
      <h3 className="text-lg font-semibold text-ink">Custody release requests</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Complete the FishNet instant transfer back to the member, then mark the
        request done. The browser is not trusted.
      </p>
      <ul className="mt-4 space-y-4">
        {requests.map((request) => (
          <li
            key={request.id}
            className="border border-line p-4 text-sm text-ink"
          >
            <p>
              Request {request.id} · {request.quantity} {unitLabel} ·{" "}
              {custodyReleaseStatusLabel(request.status)}
            </p>
            <p className="mt-1 text-ink-muted">
              Requested {formatTableDateTime(request.created_at)}
              {request.created_by_email
                ? ` by ${request.created_by_email}`
                : ""}
            </p>
            {request.fishnet_reference ? (
              <p className="mt-1 text-ink-muted">
                FishNet reference: {request.fishnet_reference}
              </p>
            ) : null}
            {request.admin_notes ? (
              <p className="mt-1 text-ink-muted">Notes: {request.admin_notes}</p>
            ) : null}
            {request.status === "PENDING" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <CompleteReleaseForm requestId={request.id} />
                <form action={cancelCustodyReleaseAction}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <PendingSubmitButton
                    className={tableSecondaryButtonClassName}
                    pendingLabel="Cancelling…"
                  >
                    Cancel request
                  </PendingSubmitButton>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {pending.length > 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          {pending.length} pending release
          {pending.length === 1 ? "" : "s"} need action.
        </p>
      ) : null}
    </section>
  );
}
