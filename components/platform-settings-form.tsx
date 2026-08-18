"use client";

import { useActionState } from "react";
import {
  buttonClassName,
  fieldClassName,
} from "@/components/auth-card";
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
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="allow_registrations"
            defaultChecked={settings.allow_registrations}
            className="mt-0.5"
          />
          <span>
            Allow new registrations
            <span className="mt-0.5 block text-ink-muted">
              Existing accounts can still log in when this is off.
            </span>
          </span>
        </label>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">
          Verified holders
        </legend>
        <p className="text-sm text-ink-muted">
          Applies to people marked verified on Users. Unverified accounts still
          need admin approval.
        </p>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="auto_approve_holdings"
            defaultChecked={settings.auto_approve_holdings}
            className="mt-0.5"
          />
          <span>
            Auto-approve holdings for verified holders
            <span className="mt-0.5 block text-ink-muted">
              When off, even verified holders wait for holding verification.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="auto_approve_listings"
            defaultChecked={settings.auto_approve_listings}
            className="mt-0.5"
          />
          <span>
            Auto-approve listings for verified holders
            <span className="mt-0.5 block text-ink-muted">
              Fixed-price listings and auctions go straight to the marketplace.
            </span>
          </span>
        </label>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">
          Transactional email
        </legend>
        <p className="text-sm text-ink-muted">
          Uncheck a message to stop sending it. Members can also turn off
          their own copies on Notifications. Auth confirm and password reset
          stay on Supabase and are not listed here. Actions still complete if
          mail is skipped.
        </p>
        <div className="max-h-80 space-y-2 overflow-y-auto border border-line bg-paper-raised p-3">
          {PRODUCT_EMAIL_IDS.map((id) => (
            <label key={id} className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="email_enabled"
                value={id}
                defaultChecked={!settings.disabled_emails.includes(id)}
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
      </fieldset>
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
