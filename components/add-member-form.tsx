"use client";

import { useActionState } from "react";
import {
  inviteMemberAction,
  type OrganisationFormState,
} from "@/lib/organisations/actions";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import type { OrganisationRole } from "@/lib/organisations/types";

const initialState: OrganisationFormState = {};

type AddMemberFormProps = {
  organisationId: number;
  actorRole: OrganisationRole;
};

export function AddMemberForm({
  organisationId,
  actorRole,
}: AddMemberFormProps) {
  const [state, formAction, pending] = useActionState(
    inviteMemberAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
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
      <div>
        <label htmlFor="email" className="block text-sm text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="role" className="block text-sm text-ink">
          Role
        </label>
        <select id="role" name="role" className={fieldClassName} defaultValue="MEMBER">
          {actorRole === "OWNER" ? <option value="OWNER">Owner</option> : null}
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
        </select>
      </div>
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}
