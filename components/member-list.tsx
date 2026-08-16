import { DataTable, DataTableRowExtras } from "@/components/data-table";
import { MemberActions } from "@/components/member-actions";
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
          <DataTableRowExtras key={member.id} id={member.id}>
            <MemberActions
              organisationId={organisationId}
              memberId={member.id}
              email={member.email}
              role={member.role}
              showRoleForm={showRoleForm}
              showRemove={showRemove}
              isSelf={isSelf}
            />
          </DataTableRowExtras>
        );
      })}
    </DataTable>
  );
}
