"use client";

import { useActionState, type ReactNode } from "react";
import {
  tableBodyCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
  tableWrapClassName,
} from "@/components/data-table";
import { SettingsSwitch } from "@/components/settings-switch";
import { StickySettingsHeader } from "@/components/sticky-settings-header";
import {
  updateNotificationPreferencesAction,
  type PreferenceFormState,
} from "@/lib/alerts/actions";
import {
  PRODUCT_EMAIL_LABELS,
  type ProductEmailId,
} from "@/lib/email/product-emails";

const initialState: PreferenceFormState = {};
const formId = "notification-channels";

export function NotificationSettingsForm({
  disabledEmails,
  disabledInApp,
  emailIds,
  children,
}: {
  disabledEmails: string[];
  disabledInApp: string[];
  emailIds: ProductEmailId[];
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferencesAction,
    initialState,
  );

  return (
    <div className="space-y-10">
      <StickySettingsHeader
        title="Notifications"
        description="In-app notices appear in the inbox below. Email and in-app can be switched separately. These settings apply to you, not the whole organisation. Platform-wide email switches stay on Admin settings."
        pending={pending}
        saveLabel="Save notifications"
        form={formId}
      />
      {children}
      <form id={formId} action={formAction} className="max-w-3xl space-y-6">
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
        <h2 className="text-lg font-semibold text-ink">Channels</h2>
        <p className="text-sm text-ink-muted">
          Choose email, in-app, or both for each message. Only messages that can
          go to you are listed. Auth confirm and password reset stay on
          Supabase. Actions still complete if a channel is off. Listing alerts
          also need a fishery switched on Alerts.
        </p>
        <div className={tableWrapClassName}>
          <table className={tableClassName}>
            <thead className={tableHeadClassName}>
              <tr>
                <th className={tableHeaderCellClassName}>Message</th>
                <th className={`w-24 ${tableHeaderCellClassName}`}>Email</th>
                <th className={`w-24 ${tableHeaderCellClassName}`}>In-app</th>
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
                  <td className={tableBodyCellClassName}>
                    <SettingsSwitch
                      name="in_app_enabled"
                      value={id}
                      defaultChecked={!disabledInApp.includes(id)}
                      label={`In-app ${PRODUCT_EMAIL_LABELS[id]}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {emailIds.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No notifications are available for this account yet.
          </p>
        ) : null}
      </form>
    </div>
  );
}
