"use client";

import { useActionState } from "react";
import {
  updateOrganisationNotificationRolesAction,
  type OrganisationFormState,
} from "@/lib/organisations/actions";
import { buttonClassName } from "@/components/auth-card";
import { organisationRoleLabel, type OrganisationRole } from "@/lib/organisations/types";

const initialState: OrganisationFormState = {};

const ROLE_OPTIONS: OrganisationRole[] = ["OWNER", "ADMIN", "MEMBER"];

export function AccountNotificationForm({
  organisationId,
  selectedRoles,
  canEdit,
}: {
  organisationId: number;
  selectedRoles: OrganisationRole[];
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateOrganisationNotificationRolesAction,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="organisation_id" value={organisationId} />
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
        Account email and in-app notices for listings, holdings, payments, and
        settlement go to these roles. Personal mail such as invitations, your
        bids, and your purchases is not controlled here.
      </p>
      <fieldset className="space-y-2" disabled={!canEdit}>
        <legend className="text-sm text-ink">Roles that receive account email</legend>
        {ROLE_OPTIONS.map((role) => (
          <label key={role} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="notification_role"
              value={role}
              defaultChecked={selectedRoles.includes(role)}
            />
            {organisationRoleLabel(role)}
          </label>
        ))}
      </fieldset>
      {canEdit ? (
        <button type="submit" className={buttonClassName} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      ) : (
        <p className="text-sm text-ink-muted">
          Only owners and admins can change who receives account email.
        </p>
      )}
    </form>
  );
}
