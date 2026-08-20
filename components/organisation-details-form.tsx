"use client";

import { useActionState } from "react";
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

const initialState: OrganisationFormState = {};

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
        <label htmlFor="entity_kind" className="block text-sm text-ink">
          Entity kind
        </label>
        <select
          id="entity_kind"
          name="entity_kind"
          defaultValue={organisation.entity_kind ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        >
          <option value="">Select…</option>
          <option value="INDIVIDUAL">Individual</option>
          <option value="COMPANY">Company</option>
        </select>
      </div>
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
      <div>
        <label htmlFor="phone" className="block text-sm text-ink">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={organisation.phone ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="mobile" className="block text-sm text-ink">
          Mobile
        </label>
        <input
          id="mobile"
          name="mobile"
          defaultValue={organisation.mobile ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="registered_address" className="block text-sm text-ink">
          Registered address
        </label>
        <textarea
          id="registered_address"
          name="registered_address"
          rows={3}
          defaultValue={organisation.registered_address ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="postal_address" className="block text-sm text-ink">
          Postal address
        </label>
        <textarea
          id="postal_address"
          name="postal_address"
          rows={3}
          defaultValue={organisation.postal_address ?? ""}
          disabled={!canEdit}
          className={fieldClassName}
        />
      </div>
      {qldJurisdictionId ? (
        <fieldset className="space-y-4 border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">
            Queensland Fisheries
          </legend>
          <p className="text-sm text-ink-muted">
            Required for Queensland quota sales and leases. Used to prepare the
            transfer application after payment and compliance.
          </p>
          <div>
            <label
              htmlFor="qld_client_reference"
              className="block text-sm text-ink"
            >
              Fisheries client number
            </label>
            <input
              id="qld_client_reference"
              name="qld_client_reference"
              defaultValue={qldProfile?.client_reference ?? ""}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
          <div>
            <label
              htmlFor="qld_licence_number"
              className="block text-sm text-ink"
            >
              Primary commercial fishing licence
            </label>
            <input
              id="qld_licence_number"
              name="qld_licence_number"
              defaultValue={qldProfile?.licence_number ?? ""}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
          <div>
            <label
              htmlFor="qld_fishery_symbols"
              className="block text-sm text-ink"
            >
              Fishery symbols
            </label>
            <input
              id="qld_fishery_symbols"
              name="qld_fishery_symbols"
              defaultValue={qldProfile?.fishery_symbols ?? ""}
              disabled={!canEdit}
              className={fieldClassName}
            />
          </div>
        </fieldset>
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
    </form>
  );
}
