"use client";

import { useActionState } from "react";
import { buttonClassName } from "@/components/auth-card";
import {
  tableBodyCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
  tableWrapClassName,
} from "@/components/data-table";
import { SettingsSwitch } from "@/components/settings-switch";
import {
  updateNotificationPreferencesAction,
  type PreferenceFormState,
} from "@/lib/alerts/actions";
import {
  PRODUCT_EMAIL_LABELS,
  type ProductEmailId,
} from "@/lib/email/product-emails";

const initialState: PreferenceFormState = {};

export function NotificationSettingsForm({
  disabledEmails,
  emailIds,
}: {
  disabledEmails: string[];
  emailIds: ProductEmailId[];
}) {
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferencesAction,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
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
      <p className="text-sm text-ink-muted">
        Turn off a message to stop sending it to you. Only messages that can
        go to this email are listed. Auth confirm and password reset stay on
        Supabase. Actions still complete if mail is skipped. Listing alerts
        also need a fishery switched on Alerts.
      </p>
      <div className={tableWrapClassName}>
        <table className={tableClassName}>
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Message</th>
              <th className={`w-24 ${tableHeaderCellClassName}`}>Email</th>
            </tr>
          </thead>
          <tbody>
            {emailIds.map((id, index) => (
              <tr key={id} className={tableRowClassName(index)}>
                <td className={tableBodyCellClassName}>
                  {PRODUCT_EMAIL_LABELS[id]}
                  <span className="mt-0.5 block font-mono text-xs text-ink-muted">
                    {id}
                  </span>
                </td>
                <td className={tableBodyCellClassName}>
                  <SettingsSwitch
                    name="email_enabled"
                    value={id}
                    defaultChecked={!disabledEmails.includes(id)}
                    label={`Email ${PRODUCT_EMAIL_LABELS[id]}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {emailIds.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No emails are available for this account yet.
        </p>
      ) : null}
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save notifications"}
      </button>
    </form>
  );
}
