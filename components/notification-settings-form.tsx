"use client";

import { useActionState } from "react";
import { buttonClassName } from "@/components/auth-card";
import {
  updateNotificationPreferencesAction,
  type PreferenceFormState,
} from "@/lib/alerts/actions";
import {
  MEMBER_EMAIL_IDS,
  OPERATOR_EMAIL_IDS,
  PRODUCT_EMAIL_LABELS,
  type ProductEmailId,
} from "@/lib/email/product-emails";

const initialState: PreferenceFormState = {};

function EmailToggles({
  ids,
  disabledEmails,
}: {
  ids: readonly ProductEmailId[];
  disabledEmails: string[];
}) {
  return (
    <div className="max-h-80 space-y-2 overflow-y-auto border border-line bg-paper-raised p-3">
      {ids.map((id) => (
        <label key={id} className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="email_enabled"
            value={id}
            defaultChecked={!disabledEmails.includes(id)}
            className="mt-0.5"
          />
          <span>
            {PRODUCT_EMAIL_LABELS[id]}
            <span className="mt-0.5 block font-mono text-xs text-ink-muted">
              {id}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function NotificationSettingsForm({
  disabledEmails,
  showOperatorEmails,
}: {
  disabledEmails: string[];
  showOperatorEmails: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferencesAction,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
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
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Email</legend>
        <p className="text-sm text-ink-muted">
          Uncheck a message to stop sending it to you. Auth confirm and
          password reset stay on Supabase. Actions still complete if mail is
          skipped. Listing alerts also need a fishery ticked on Alerts.
        </p>
        <EmailToggles ids={MEMBER_EMAIL_IDS} disabledEmails={disabledEmails} />
      </fieldset>
      {showOperatorEmails ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">
            Operator email
          </legend>
          <p className="text-sm text-ink-muted">
            These go to platform admins only.
          </p>
          <EmailToggles
            ids={OPERATOR_EMAIL_IDS}
            disabledEmails={disabledEmails}
          />
        </fieldset>
      ) : null}
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save notifications"}
      </button>
    </form>
  );
}
