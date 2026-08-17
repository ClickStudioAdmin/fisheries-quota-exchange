"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  removeMemberAction,
  updateMemberRoleAction,
  type MemberActionState,
} from "@/lib/organisations/actions";
import {
  fieldClassName,
  tableButtonClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";
import { TableModal } from "@/components/table-modal";
import type { OrganisationRole } from "@/lib/organisations/types";

const initialState: MemberActionState = {};

type MemberActionsProps = {
  organisationId: number;
  memberId: number;
  email: string;
  role: OrganisationRole;
  showRoleForm: boolean;
  showRemove: boolean;
  isSelf: boolean;
};

export function MemberActions({
  organisationId,
  memberId,
  email,
  role,
  showRoleForm,
  showRemove,
  isSelf,
}: MemberActionsProps) {
  const router = useRouter();
  const [removeState, removeAction, removePending] = useActionState(
    removeMemberAction,
    initialState,
  );

  useEffect(() => {
    if (removeState.left) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    if (removeState.message) {
      router.refresh();
    }
  }, [removeState.left, removeState.message, router]);

  return (
    <div className="space-y-2">
      {removeState.error ? (
        <p className="text-sm text-red-800" role="alert">
          {removeState.error}
        </p>
      ) : null}
      {removeState.message ? (
        <p className="text-sm text-sea" role="status">
          {removeState.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {showRoleForm ? (
          <TableModal title={`Edit ${email}`}>
            {(close) => (
              <MemberRoleForm
                organisationId={organisationId}
                memberId={memberId}
                email={email}
                role={role}
                onSaved={close}
              />
            )}
          </TableModal>
        ) : null}
        {showRemove ? (
          <form action={removeAction}>
            <input
              type="hidden"
              name="organisation_id"
              value={String(organisationId)}
            />
            <input type="hidden" name="member_id" value={String(memberId)} />
            <input type="hidden" name="target_role" value={role} />
            <input type="hidden" name="target_email" value={email} />
            <button
              type="submit"
              className={tableSecondaryButtonClassName}
              disabled={removePending}
            >
              {removePending ? "Removing…" : isSelf ? "Leave" : "Remove"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function MemberRoleForm({
  organisationId,
  memberId,
  email,
  role,
  onSaved,
}: {
  organisationId: number;
  memberId: number;
  email: string;
  role: OrganisationRole;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateMemberRoleAction,
    initialState,
  );

  useEffect(() => {
    if (state.message) {
      onSaved();
      router.refresh();
    }
  }, [state.message, onSaved, router]);

  return (
    <form action={action} className="space-y-3">
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <input
        type="hidden"
        name="organisation_id"
        value={String(organisationId)}
      />
      <input type="hidden" name="member_id" value={String(memberId)} />
      <div>
        <label htmlFor={`role-${memberId}`} className="block text-sm text-ink">
          Role for {email}
        </label>
        <select
          id={`role-${memberId}`}
          name="role"
          defaultValue={role}
          className={fieldClassName}
        >
          <option value="OWNER">Owner</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
        </select>
      </div>
      <button type="submit" className={tableButtonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
