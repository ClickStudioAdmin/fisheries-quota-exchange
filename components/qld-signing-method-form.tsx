"use client";

import { useActionState } from "react";
import { tableButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { saveComplianceChecklistAction } from "@/lib/orders/actions";
import { signingChannelLabel } from "@/lib/transfers/signing-channel";
import type { SigningChannel } from "@/lib/transfers/signing-channel";

const initialState: { error?: string; message?: string } = {};

export function QldSigningMethodForm({
  orderId,
  completedChecks,
  selectedChannel,
  savedChannel,
  defaultChannel,
  pandadocReady,
}: {
  orderId: number;
  completedChecks: readonly string[];
  selectedChannel: SigningChannel;
  savedChannel: SigningChannel | null;
  defaultChannel: SigningChannel;
  pandadocReady: boolean;
}) {
  const [state, formAction] = useActionState(
    saveComplianceChecklistAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      {completedChecks.map((item) => (
        <input key={item} type="hidden" name="checks" value={item} />
      ))}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Signing method</legend>
        <p className="text-sm text-ink-muted">
          Offline pack is the Phase 10 seller-then-buyer upload. Sign online
          lets both parties sign in FQX at the same time. Save this before you
          approve. The browser is not trusted.
        </p>
        {(
          [
            ["OFFLINE", signingChannelLabel("OFFLINE")],
            ["PANDADOC", signingChannelLabel("PANDADOC")],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex items-start gap-2 text-sm text-ink"
          >
            <input
              type="radio"
              name="qld_signing_channel"
              value={value}
              defaultChecked={selectedChannel === value}
              disabled={value === "PANDADOC" && !pandadocReady}
            />
            <span>
              {label}
              {value === "PANDADOC" && !pandadocReady
                ? " (PandaDoc keys are not configured)"
                : null}
            </span>
          </label>
        ))}
        {savedChannel ? (
          <p className="text-sm text-ink-muted">
            Saved as {signingChannelLabel(savedChannel)}.
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            Not saved yet. Pre-filled from platform default (
            {signingChannelLabel(defaultChannel)}).
          </p>
        )}
      </fieldset>
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
      <PendingSubmitButton
        className={tableButtonClassName}
        pendingLabel="Saving…"
        name="intent"
        value="save"
      >
        Save signing method
      </PendingSubmitButton>
    </form>
  );
}
