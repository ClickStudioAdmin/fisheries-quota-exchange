"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  removeMemberAction,
  updateMemberRoleAction,
  type MemberActionState,
} from "@/lib/organisations/actions";
import {
  compactFieldClassName,
  tableButtonClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";
import { TableActionRow } from "@/components/data-table";
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
  const [roleState, roleAction, rolePending] = useActionState(
    updateMemberRoleAction,
    initialState,
  );
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

    if (removeState.message || roleState.message) {
      router.refresh();
    }
  }, [removeState.left, removeState.message, roleState.message, router]);

  return (
    <div className="space-y-2">
      {roleState.error || removeState.error ? (
        <p className="text-sm text-red-800" role="alert">
          {roleState.error ?? removeState.error}
        </p>
      ) : null}
      {roleState.message || removeState.message ? (
        <p className="text-sm text-sea" role="status">
          {roleState.message ?? removeState.message}
        </p>
      ) : null}
      <TableActionRow>
        {showRoleForm ? (
          <form action={roleAction} className="flex gap-2">
            <input
              type="hidden"
              name="organisation_id"
              value={String(organisationId)}
            />
            <input type="hidden" name="member_id" value={String(memberId)} />
            <label className="sr-only" htmlFor={`role-${memberId}`}>
              Role for {email}
            </label>
            <select
              id={`role-${memberId}`}
              name="role"
              defaultValue={role}
              className={compactFieldClassName}
            >
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
            </select>
            <button
              type="submit"
              className={tableButtonClassName}
              disabled={rolePending}
            >
              {rolePending ? "Updating…" : "Update"}
            </button>
          </form>
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
      </TableActionRow>
    </div>
  );
}
