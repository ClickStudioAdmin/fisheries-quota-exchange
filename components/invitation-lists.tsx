import { DataTable, DataTableRowExtras } from "@/components/data-table";
import {
  CancelInvitationButton,
  InvitationDecisionForms,
} from "@/components/invitation-actions";
import { panelClassName } from "@/components/surface";
import { formatTableDate, timestampHasPassed } from "@/lib/format";
import { canCancelInvitation } from "@/lib/organisations/permissions";
import { organisationRoleLabel } from "@/lib/organisations/types";
import type {
  OrganisationInvitation,
  OrganisationRole,
} from "@/lib/organisations/types";

function invitationStatus(expiresAt: string) {
  return timestampHasPassed(expiresAt) ? "Expired" : "Pending";
}

export function OrganisationInvitationList({
  organisationId,
  invitations,
  actorRole,
}: {
  organisationId: number;
  invitations: OrganisationInvitation[];
  actorRole: OrganisationRole;
}) {
  return (
    <DataTable
      caption="Pending invitations"
      empty="No pending invitations."
      searchPlaceholder="Filter invitations…"
      defaultSort={{ key: "created", direction: "desc" }}
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
        { key: "created", header: "Invited", sortable: true },
        { key: "expires", header: "Expires", sortable: true },
        {
          key: "status",
          header: "Status",
          sortable: true,
          filter: "select",
          filterOptions: [
            { value: "Pending", label: "Pending" },
            { value: "Expired", label: "Expired" },
          ],
        },
      ]}
      rows={invitations.map((invitation) => ({
        id: invitation.id,
        values: {
          email: invitation.email,
          role: invitation.role,
          created: invitation.created_at,
          expires: invitation.expires_at,
          status: invitationStatus(invitation.expires_at),
        },
        display: {
          role: organisationRoleLabel(invitation.role),
          created: formatTableDate(invitation.created_at),
          expires: formatTableDate(invitation.expires_at),
        },
      }))}
    >
      {invitations.map((invitation) => {
        if (!canCancelInvitation(actorRole, invitation.role)) {
          return null;
        }

        return (
          <DataTableRowExtras
            key={invitation.id}
            id={invitation.id}
            actions={
              <CancelInvitationButton
                organisationId={organisationId}
                invitationId={invitation.id}
                invitedRole={invitation.role}
              />
            }
          />
        );
      })}
    </DataTable>
  );
}

export function MyInvitationList({
  invitations,
}: {
  invitations: OrganisationInvitation[];
}) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className={panelClassName}>
      <h2 className="text-lg font-semibold text-ink">Pending invitations</h2>
      <p className="mt-2 text-sm text-ink-muted">
        You are not a member of these businesses until you accept.
      </p>
      <ul className="mt-4 space-y-4">
        {invitations.map((invitation) => {
          const expired = timestampHasPassed(invitation.expires_at);

          return (
            <li key={invitation.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
              <p className="text-sm font-medium text-ink">
                {invitation.organisation_name}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {organisationRoleLabel(invitation.role)} · expires{" "}
                {formatTableDate(invitation.expires_at)}
              </p>
              {expired ? (
                <p className="mt-2 text-sm text-ink-muted">
                  This invitation has expired. Ask an owner or admin to send a
                  new one.
                </p>
              ) : invitation.token ? (
                <div className="mt-3">
                  <InvitationDecisionForms token={invitation.token} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
