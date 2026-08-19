"use client";

import { useActionState } from "react";
import {
  updateOrganisationDetailsAction,
  type OrganisationFormState,
} from "@/lib/organisations/actions";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import type { Organisation } from "@/lib/organisations/types";

const initialState: OrganisationFormState = {};

export function OrganisationDetailsForm({
  organisation,
  canEdit,
}: {
  organisation: Organisation;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateOrganisationDetailsAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="organisation_id" value={organisation.id} />
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
