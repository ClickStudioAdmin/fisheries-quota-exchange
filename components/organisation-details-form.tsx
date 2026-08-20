"use client";

import { useActionState, useState } from "react";
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

const initialState: OrganisationFormState = {};

function AddressFields({
  prefix,
  legend,
  address,
  canEdit,
}: {
  prefix: "registered" | "postal";
  legend: string;
  address: AustralianAddress | null;
  canEdit: boolean;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div>
        <label htmlFor={`${prefix}_line1`} className="block text-sm text-ink">
          Street address
        </label>
        <input
          id={`${prefix}_line1`}
          name={`${prefix}_line1`}
          autoComplete="address-line1"
          defaultValue={address?.line1 ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor={`${prefix}_line2`} className="block text-sm text-ink">
          Address line 2
        </label>
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
        <label htmlFor={`${prefix}_suburb`} className="block text-sm text-ink">
          Suburb
        </label>
        <input
          id={`${prefix}_suburb`}
          name={`${prefix}_suburb`}
          autoComplete="address-level2"
          defaultValue={address?.suburb ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}_state`} className="block text-sm text-ink">
            State
          </label>
          <select
            id={`${prefix}_state`}
            name={`${prefix}_state`}
            autoComplete="address-level1"
            defaultValue={address?.state ?? ""}
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
          <label
            htmlFor={`${prefix}_postcode`}
            className="block text-sm text-ink"
          >
            Postcode
          </label>
          <input
            id={`${prefix}_postcode`}
            name={`${prefix}_postcode`}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={4}
            defaultValue={address?.postcode ?? ""}
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
}: {
  profile: OrganisationJurisdictionProfile | null;
  canEdit: boolean;
}) {
  return (
    <fieldset className="min-w-0 space-y-4 self-start border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-ink">
        Queensland Fisheries
      </legend>
      <p className="text-sm text-ink-muted">
        Required for Queensland quota sales and leases. Used to prepare the
        transfer application after payment and compliance.
      </p>
      <div>
        <label htmlFor="qld_client_reference" className="block text-sm text-ink">
          Fisheries client number
        </label>
        <input
          id="qld_client_reference"
          name="qld_client_reference"
          defaultValue={profile?.client_reference ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="qld_licence_number" className="block text-sm text-ink">
          Primary commercial fishing licence
        </label>
        <input
          id="qld_licence_number"
          name="qld_licence_number"
          defaultValue={profile?.licence_number ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="qld_fishery_symbols" className="block text-sm text-ink">
          Fishery symbols
        </label>
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

export function OrganisationDetailsForm({
  organisation,
  qldProfile,
  qldJurisdictionId,
  canEdit,
}: {
  organisation: Organisation;
  qldProfile: OrganisationJurisdictionProfile | null;
  qldJurisdictionId: number | null;
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

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="organisation_id" value={organisation.id} />
      {qldJurisdictionId ? (
        <input
          type="hidden"
          name="qld_jurisdiction_id"
          value={qldJurisdictionId}
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
      <div
        className={
          qldJurisdictionId
            ? "grid items-start gap-8 lg:grid-cols-2"
            : "space-y-4"
        }
      >
        <div className="min-w-0 space-y-4">
          <div>
            <label htmlFor="entity_kind" className="block text-sm text-ink">
              Entity kind
            </label>
            <select
              id="entity_kind"
              name="entity_kind"
              value={entityKind}
              onChange={(event) => setEntityKind(event.target.value)}
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
              <label htmlFor="acn" className="block text-sm text-ink">
                ACN
              </label>
              <input
                id="acn"
                name="acn"
                inputMode="numeric"
                defaultValue={organisation.acn ?? ""}
                disabled={!canEdit}
                className={fieldClassName}
              />
            </div>
          ) : null}
          <div>
            <label htmlFor="abn" className="block text-sm text-ink">
              ABN
            </label>
            <input
              id="abn"
              name="abn"
              inputMode="numeric"
              defaultValue={organisation.abn ?? ""}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
          <div>
            <label htmlFor="legal_name" className="block text-sm text-ink">
              Legal name
            </label>
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
            <label htmlFor="trading_name" className="block text-sm text-ink">
              Trading name
            </label>
            <input
              id="trading_name"
              name="trading_name"
              defaultValue={organisation.trading_name ?? ""}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
          <div>
            <label htmlFor="mobile" className="block text-sm text-ink">
              Phone
            </label>
            <input
              id="mobile"
              name="mobile"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={organisation.mobile ?? ""}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
        </div>
        {qldJurisdictionId ? (
          <QldFisheriesFields profile={qldProfile} canEdit={canEdit} />
        ) : null}
      </div>
      <div className="max-w-lg space-y-4">
        <AddressFields
          prefix="registered"
          legend="Registered address"
          address={organisation.registered_address}
          canEdit={canEdit}
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
        />
      ) : null}
      <div className="divide-y divide-line border border-line bg-paper-raised">
        <SettingsSwitchRow
          name="hide_identity"
          defaultChecked={organisation.hide_identity}
          disabled={!canEdit}
          title="Hide my Identity"
          description='Marketplace, fishery, and auction pages show “Private Seller” for listings and “Private Buyer” for bids instead of this business name, including when you are signed in as this business. Orders, invoices, and admin records still use the real name. Platform admins see the real name in a tooltip.'
        />
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
      </div>
    </form>
  );
}
