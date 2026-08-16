import {
  removeMemberAction,
  updateMemberRoleAction,
} from "@/lib/organisations/actions";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import {
  canChangeMemberRole,
  canRemoveMember,
} from "@/lib/organisations/permissions";
import type {
  OrganisationMember,
  OrganisationRole,
} from "@/lib/organisations/types";

type MemberListProps = {
  organisationId: number;
  members: OrganisationMember[];
  actorRole: OrganisationRole;
  actorEmail: string;
};

export function MemberList({
  organisationId,
  members,
  actorRole,
  actorEmail,
}: MemberListProps) {
  return (
    <ul className="divide-y divide-line border border-line">
      {members.map((member) => {
        const isSelf = member.email === actorEmail.toLowerCase();
        const showRoleForm = canChangeMemberRole(actorRole) && !isSelf;
        const showRemove = canRemoveMember(actorRole, member.role, isSelf);

        return (
          <li
            key={member.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-ink">{member.email}</p>
              <p className="text-sm text-ink-muted">{member.role}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {showRoleForm ? (
                <form action={updateMemberRoleAction} className="flex gap-2">
                  <input
                    type="hidden"
                    name="organisation_id"
                    value={organisationId}
                  />
                  <input type="hidden" name="member_id" value={member.id} />
                  <label className="sr-only" htmlFor={`role-${member.id}`}>
                    Role for {member.email}
                  </label>
                  <select
                    id={`role-${member.id}`}
                    name="role"
                    defaultValue={member.role}
                    className={fieldClassName}
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                  </select>
                  <button type="submit" className={buttonClassName}>
                    Update
                  </button>
                </form>
              ) : null}
              {showRemove ? (
                <form action={removeMemberAction}>
                  <input
                    type="hidden"
                    name="organisation_id"
                    value={organisationId}
                  />
                  <input type="hidden" name="member_id" value={member.id} />
                  <input type="hidden" name="target_role" value={member.role} />
                  <input type="hidden" name="target_email" value={member.email} />
                  <button
                    type="submit"
                    className="border border-line px-4 py-2 text-sm text-ink hover:bg-paper-raised"
                  >
                    {isSelf ? "Leave" : "Remove"}
                  </button>
                </form>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
