import {
  removeMemberAction,
  updateMemberRoleAction,
} from "@/lib/organisations/actions";
import {
  compactFieldClassName,
  tableButtonClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";
import {
  DataTable,
  DataTableRowExtras,
  TableActionRow,
} from "@/components/data-table";
import { formatTableDate } from "@/lib/format";
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

const roleLabel: Record<OrganisationRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export function MemberList({
  organisationId,
  members,
  actorRole,
  actorEmail,
}: MemberListProps) {
  return (
    <DataTable
      caption="Account members"
      empty="No members yet."
      searchPlaceholder="Filter members…"
      defaultSort={{ key: "email", direction: "asc" }}
      columns={[
        { key: "email", header: "Email", sortable: true },
        {
          key: "role",
          header: "Role",
          sortable: true,
          filter: "select",
          filterOptions: [
            { value: "OWNER", label: "Owner" },
            { value: "ADMIN", label: "Admin" },
            { value: "MEMBER", label: "Member" },
          ],
        },
        { key: "created", header: "Added", sortable: true },
      ]}
      rows={members.map((member) => ({
        id: member.id,
        values: {
          email: member.email,
          role: member.role,
          created: member.created_at,
        },
        display: {
          role: roleLabel[member.role],
          created: formatTableDate(member.created_at),
        },
      }))}
    >
      {members.map((member) => {
        const isSelf = member.email === actorEmail.toLowerCase();
        const showRoleForm = canChangeMemberRole(actorRole) && !isSelf;
        const showRemove = canRemoveMember(actorRole, member.role, isSelf);

        if (!showRoleForm && !showRemove) {
          return null;
        }

        return (
          <DataTableRowExtras
            key={member.id}
            id={member.id}
            actions={
              <TableActionRow>
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
                      className={compactFieldClassName}
                    >
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                    <button type="submit" className={tableButtonClassName}>
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
                    <input
                      type="hidden"
                      name="target_email"
                      value={member.email}
                    />
                    <button
                      type="submit"
                      className={tableSecondaryButtonClassName}
                    >
                      {isSelf ? "Leave" : "Remove"}
                    </button>
                  </form>
                ) : null}
              </TableActionRow>
            }
          />
        );
      })}
    </DataTable>
  );
}
