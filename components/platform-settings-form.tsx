"use client";

import { useActionState } from "react";
import {
  buttonClassName,
  fieldClassName,
} from "@/components/auth-card";
import {
  tableBodyCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
  tableWrapClassName,
} from "@/components/data-table";
import { SettingsSwitch, SettingsSwitchRow } from "@/components/settings-switch";
import {
  updatePlatformSettingsAction,
  type SettingsFormState,
} from "@/lib/settings/actions";
import type { PlatformSettings } from "@/lib/settings/types";
import {
  PRODUCT_EMAIL_IDS,
  PRODUCT_EMAIL_LABELS,
} from "@/lib/email/product-emails";

const initialState: SettingsFormState = {};

export function PlatformSettingsForm({
  settings,
}: {
  settings: PlatformSettings;
}) {
  const [state, formAction, pending] = useActionState(
    updatePlatformSettingsAction,
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
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Fees</legend>
        <p className="text-sm text-ink-muted">
          Deducted from the seller on successful sales and leases. The buyer
          pays the listed amount. The fee is recorded on the order.
        </p>
        <div>
          <label htmlFor="sale_fee_percent" className="block text-sm text-ink">
            Sale fee (%)
          </label>
          <input
            id="sale_fee_percent"
            name="sale_fee_percent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            defaultValue={settings.sale_fee_percent}
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor="lease_fee_percent" className="block text-sm text-ink">
            Lease fee (%)
          </label>
          <input
            id="lease_fee_percent"
            name="lease_fee_percent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            defaultValue={settings.lease_fee_percent}
            className={fieldClassName}
          />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Access</legend>
        <div className="divide-y divide-line border border-line bg-paper-raised">
          <SettingsSwitchRow
            name="allow_registrations"
            defaultChecked={settings.allow_registrations}
            title="Allow new registrations"
            description="Existing accounts can still log in when this is off."
            className="bg-paper-raised hover:bg-line/40"
          />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">
          Verified holders
        </legend>
        <p className="text-sm text-ink-muted">
          Applies to people marked verified on Users. Unverified accounts still
          need admin approval.
        </p>
        <div className="divide-y divide-line border border-line bg-paper-raised">
          <SettingsSwitchRow
            name="auto_approve_holdings"
            defaultChecked={settings.auto_approve_holdings}
            title="Auto-approve holdings for verified holders"
            description="When off, even verified holders wait for holding verification."
            className="bg-paper-raised hover:bg-line/40"
          />
          <SettingsSwitchRow
            name="auto_approve_listings"
            defaultChecked={settings.auto_approve_listings}
            title="Auto-approve listings for verified holders"
            description="Fixed-price listings and auctions go straight to the marketplace."
            className="bg-paper-stripe hover:bg-line/40"
          />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">
          Transactional email
        </legend>
        <p className="text-sm text-ink-muted">
          Turn off a message to stop sending it for everyone. Members can turn
          off their own copies of mail that goes to them on Notifications.
          Operator mail is only listed here. Auth confirm and password reset
          stay on Supabase and are not listed. Actions still complete if mail
          is skipped.
        </p>
        <div className={tableWrapClassName}>
          <table className={tableClassName}>
            <thead className={tableHeadClassName}>
              <tr>
                <th className={tableHeaderCellClassName}>Message</th>
                <th className={`w-24 ${tableHeaderCellClassName}`}>Send</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_EMAIL_IDS.map((id, index) => (
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
                      defaultChecked={!settings.disabled_emails.includes(id)}
                      label={`Send ${PRODUCT_EMAIL_LABELS[id]}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
