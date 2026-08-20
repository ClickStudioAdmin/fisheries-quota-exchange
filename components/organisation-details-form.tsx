"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  updateOrganisationDetailsAction,
  type OrganisationFormState,
} from "@/lib/organisations/actions";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import { SettingsSwitchRow } from "@/components/settings-switch";
import type {
  Organisation,
  OrganisationJurisdictionProfile,
} from "@/lib/organisations/types";
import {
  AU_STATES,
  type AustralianAddress,
} from "@/lib/organisations/address";
import {
  isSelectableJurisdictionCode,
  organisationEnablesJurisdiction,
  sortJurisdictionsForSelect,
} from "@/lib/organisations/enabled-jurisdictions";
import type { Jurisdiction } from "@/lib/fisheries/types";

const initialState: OrganisationFormState = {};

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-ink">
      {children}
      {required ? (
        <span className="font-normal text-ink-muted"> (required)</span>
      ) : null}
    </label>
  );
}

function AddressFields({
  prefix,
  legend,
  address,
  canEdit,
  required,
}: {
  prefix: "registered" | "postal";
  legend: string;
  address: AustralianAddress | null;
  canEdit: boolean;
  required?: boolean;
}) {
  const markRequired = Boolean(required && canEdit);

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-ink">
        {legend}
        {required ? (
          <span className="font-normal text-ink-muted"> (required)</span>
        ) : null}
      </legend>
      <div>
        <FieldLabel htmlFor={`${prefix}_line1`} required={required}>
          Street address
        </FieldLabel>
        <input
          id={`${prefix}_line1`}
          name={`${prefix}_line1`}
          autoComplete="address-line1"
          defaultValue={address?.line1 ?? ""}
          required={markRequired}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <FieldLabel htmlFor={`${prefix}_line2`}>Address line 2</FieldLabel>
        <input
          id={`${prefix}_line2`}
          name={`${prefix}_line2`}
          autoComplete="address-line2"
          defaultValue={address?.line2 ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <FieldLabel htmlFor={`${prefix}_suburb`} required={required}>
          Suburb
        </FieldLabel>
        <input
          id={`${prefix}_suburb`}
          name={`${prefix}_suburb`}
          autoComplete="address-level2"
          defaultValue={address?.suburb ?? ""}
          required={markRequired}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={`${prefix}_state`} required={required}>
            State
          </FieldLabel>
          <select
            id={`${prefix}_state`}
            name={`${prefix}_state`}
            autoComplete="address-level1"
            defaultValue={address?.state ?? ""}
            required={markRequired}
            disabled={!canEdit}
            className={fieldClassName}
          >
            <option value="">Select…</option>
            {AU_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.code} — {state.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor={`${prefix}_postcode`} required={required}>
            Postcode
          </FieldLabel>
          <input
            id={`${prefix}_postcode`}
            name={`${prefix}_postcode`}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={4}
            defaultValue={address?.postcode ?? ""}
            required={markRequired}
            disabled={!canEdit}
            className={fieldClassName}
          />
        </div>
      </div>
    </fieldset>
  );
}

function QldFisheriesFields({
  profile,
  canEdit,
  required,
}: {
  profile: OrganisationJurisdictionProfile | null;
  canEdit: boolean;
  required?: boolean;
}) {
  const markRequired = Boolean(required && canEdit);

  return (
    <fieldset className="min-w-0 space-y-4 border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-ink">
        Queensland Fisheries
      </legend>
      <p className="text-sm text-ink-muted">
        Client number and primary licence are required for Queensland trades.
        They are also used to prepare the transfer application after payment
        and compliance. Fishery symbols are optional.
      </p>
      <div>
        <FieldLabel htmlFor="qld_client_reference" required={required}>
          Fisheries client number
        </FieldLabel>
        <input
          id="qld_client_reference"
          name="qld_client_reference"
          defaultValue={profile?.client_reference ?? ""}
          required={markRequired}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <FieldLabel htmlFor="qld_licence_number" required={required}>
          Primary commercial fishing licence
        </FieldLabel>
        <input
          id="qld_licence_number"
          name="qld_licence_number"
          defaultValue={profile?.licence_number ?? ""}
          required={markRequired}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <FieldLabel htmlFor="qld_fishery_symbols">Fishery symbols</FieldLabel>
        <input
          id="qld_fishery_symbols"
          name="qld_fishery_symbols"
          defaultValue={profile?.fishery_symbols ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
    </fieldset>
  );
}

function JurisdictionPillSelect({
  jurisdictions,
  enabledCodes,
  onEnabledCodesChange,
  canEdit,
}: {
  jurisdictions: Jurisdiction[];
  enabledCodes: string[];
  onEnabledCodesChange: (codes: string[]) => void;
  canEdit: boolean;
}) {
  const ordered = sortJurisdictionsForSelect(jurisdictions);
  const selected = ordered.filter((item) =>
    organisationEnablesJurisdiction(enabledCodes, item.code),
  );
  const remaining = ordered.filter(
    (item) => !organisationEnablesJurisdiction(enabledCodes, item.code),
  );

  function add(code: string) {
    if (!code || !isSelectableJurisdictionCode(code)) {
      return;
    }

    onEnabledCodesChange(
      enabledCodes.includes(code) ? enabledCodes : [...enabledCodes, code],
    );
  }

  function remove(code: string) {
    onEnabledCodesChange(enabledCodes.filter((item) => item !== code));
  }

  return (
    <div className={`${fieldClassName} flex min-h-10 flex-wrap items-center gap-1.5`}>
      {selected.map((jurisdiction) => (
        <span
          key={jurisdiction.id}
          className="inline-flex items-center gap-1 rounded-full bg-sea px-2 py-0.5 text-xs font-medium text-paper"
        >
          <input
            type="hidden"
            name="jurisdiction_code"
            value={jurisdiction.code}
          />
          {jurisdiction.name}
          {canEdit ? (
            <button
              type="button"
              aria-label={`Remove ${jurisdiction.name}`}
              onClick={() => remove(jurisdiction.code)}
              className="rounded-full leading-none text-paper/80 hover:text-paper"
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
      {canEdit && remaining.length > 0 ? (
        <select
          id="jurisdiction_code"
          value=""
          aria-label="Add jurisdiction"
          onChange={(event) => {
            add(event.target.value);
          }}
          className="min-w-28 flex-1 border-0 bg-transparent py-0 text-sm text-ink outline-none"
        >
          <option value="">
            {selected.length === 0 ? "Select jurisdictions…" : "Add…"}
          </option>
          {remaining.map((jurisdiction) => {
            const selectable = isSelectableJurisdictionCode(jurisdiction.code);
            return (
              <option
                key={jurisdiction.id}
                value={jurisdiction.code}
                disabled={!selectable}
              >
                {selectable
                  ? jurisdiction.name
                  : `${jurisdiction.name} (coming later)`}
              </option>
            );
          })}
        </select>
      ) : selected.length === 0 ? (
        <span className="text-sm text-ink-muted">None selected</span>
      ) : null}
    </div>
  );
}

export function OrganisationDetailsForm({
  organisation,
  jurisdictions,
  qldProfile,
  canEdit,
}: {
  organisation: Organisation;
  jurisdictions: Jurisdiction[];
  qldProfile: OrganisationJurisdictionProfile | null;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateOrganisationDetailsAction,
    initialState,
  );
  const [entityKind, setEntityKind] = useState(organisation.entity_kind ?? "");
  const [postalDifferent, setPostalDifferent] = useState(
    organisation.postal_same_as_registered === false,
  );
  const [enabledCodes, setEnabledCodes] = useState(
    organisation.enabled_jurisdiction_codes,
  );
  const qldJurisdiction = jurisdictions.find((item) => item.code === "QLD") ?? null;
  const qldEnabled = organisationEnablesJurisdiction(enabledCodes, "QLD");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="organisation_id" value={organisation.id} />
      {qldJurisdiction ? (
        <input
          type="hidden"
          name="qld_jurisdiction_id"
          value={qldJurisdiction.id}
        />
      ) : null}
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
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <div>
            <FieldLabel htmlFor="entity_kind" required>
              Entity kind
            </FieldLabel>
            <select
              id="entity_kind"
              name="entity_kind"
              value={entityKind}
              onChange={(event) => setEntityKind(event.target.value)}
              required={canEdit}
              disabled={!canEdit}
              className={fieldClassName}
            >
              <option value="">Select…</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="COMPANY">Company</option>
            </select>
          </div>
          {entityKind === "COMPANY" ? (
            <div>
              <FieldLabel htmlFor="acn" required>
                ACN
              </FieldLabel>
              <input
                id="acn"
                name="acn"
                inputMode="numeric"
                defaultValue={organisation.acn ?? ""}
                required={canEdit}
                disabled={!canEdit}
                className={fieldClassName}
              />
            </div>
          ) : null}
          <div>
            <FieldLabel htmlFor="abn" required>
              ABN
            </FieldLabel>
            <input
              id="abn"
              name="abn"
              inputMode="numeric"
              defaultValue={organisation.abn ?? ""}
              required={canEdit}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="legal_name" required>
              Legal name
            </FieldLabel>
            <input
              id="legal_name"
              name="legal_name"
              required={canEdit}
              defaultValue={organisation.legal_name}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="trading_name">Trading name</FieldLabel>
            <input
              id="trading_name"
              name="trading_name"
              defaultValue={organisation.trading_name ?? ""}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="mobile" required>
              Phone
            </FieldLabel>
            <input
              id="mobile"
              name="mobile"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={organisation.mobile ?? ""}
              required={canEdit}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
          <AddressFields
            prefix="registered"
            legend="Registered address"
            address={organisation.registered_address}
            canEdit={canEdit}
            required
          />
          <div className="divide-y divide-line border border-line bg-paper-raised">
            <SettingsSwitchRow
              name="postal_different"
              checked={postalDifferent}
              onCheckedChange={setPostalDifferent}
              disabled={!canEdit}
              title="Postal address is different"
              description="Turn this on if mail should go to a different address from the registered address."
            />
          </div>
          {postalDifferent ? (
            <AddressFields
              prefix="postal"
              legend="Postal address"
              address={organisation.postal_address}
              canEdit={canEdit}
              required
            />
          ) : null}
        </div>
        <div className="min-w-0 space-y-4">
          {jurisdictions.length > 0 ? (
            <div>
              <FieldLabel htmlFor="jurisdiction_code">Jurisdictions</FieldLabel>
              <p className="mt-1 text-sm text-ink-muted">
                Select every jurisdiction this business trades in. Queensland is
                available now; others will open as we add them.
              </p>
              <JurisdictionPillSelect
                jurisdictions={jurisdictions}
                enabledCodes={enabledCodes}
                onEnabledCodesChange={setEnabledCodes}
                canEdit={canEdit}
              />
            </div>
          ) : null}
          {qldEnabled && qldJurisdiction ? (
            <QldFisheriesFields
              profile={qldProfile}
              canEdit={canEdit}
              required
            />
          ) : null}
          <div className="divide-y divide-line border border-line bg-paper-raised">
            <SettingsSwitchRow
              name="hide_identity"
              defaultChecked={organisation.hide_identity}
              disabled={!canEdit}
              title="Hide my Identity"
              description='Marketplace, fishery, and auction pages show “Private Seller” for listings and “Private Buyer” for bids instead of this business name, including when you are signed in as this business. Orders, invoices, and admin records still use the real name. Platform admins can still see your name everywhere.'
            />
          </div>
        </div>
      </div>
      {canEdit ? (
        <button type="submit" className={buttonClassName} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      ) : (
        <p className="text-sm text-ink-muted">
          Only owners and admins can edit business details.
        </p>
      )}
    </form>
  );
}
