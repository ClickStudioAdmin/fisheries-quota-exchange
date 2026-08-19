import type { OrganisationRole } from "./types";

export type PrivilegeCell = "Yes" | "No" | string;

export type PrivilegeRow = {
  id: string;
  task: string;
  cells: Record<OrganisationRole, PrivilegeCell>;
};

export type PrivilegeGroup = {
  label: string;
  rows: readonly PrivilegeRow[];
};

const YES: Record<OrganisationRole, PrivilegeCell> = {
  OWNER: "Yes",
  ADMIN: "Yes",
  MEMBER: "Yes",
};

const MANAGERS: Record<OrganisationRole, PrivilegeCell> = {
  OWNER: "Yes",
  ADMIN: "Yes",
  MEMBER: "No",
};

const OWNERS: Record<OrganisationRole, PrivilegeCell> = {
  OWNER: "Yes",
  ADMIN: "No",
  MEMBER: "No",
};

export const ORGANISATION_PRIVILEGE_GROUPS: readonly PrivilegeGroup[] = [
  {
    label: "This business",
    rows: [
      {
        id: "view",
        task: "View business, people, holdings, listings, and orders",
        cells: YES,
      },
      {
        id: "edit_details",
        task: "Edit business details",
        cells: MANAGERS,
      },
      {
        id: "notification_roles",
        task: "Change who receives business email",
        cells: MANAGERS,
      },
      {
        id: "payments_setup",
        task: "Set up Stripe payments",
        cells: MANAGERS,
      },
    ],
  },
  {
    label: "People",
    rows: [
      {
        id: "invite_admin_or_member",
        task: "Invite Admin or Member",
        cells: MANAGERS,
      },
      {
        id: "invite_owner",
        task: "Invite Owner",
        cells: OWNERS,
      },
      {
        id: "cancel_invitation",
        task: "Cancel a pending invitation",
        cells: {
          OWNER: "Yes",
          ADMIN: "Yes, except Owner invites",
          MEMBER: "No",
        },
      },
      {
        id: "change_role",
        task: "Change a member's role",
        cells: OWNERS,
      },
      {
        id: "remove_member",
        task: "Remove a Member",
        cells: MANAGERS,
      },
      {
        id: "remove_owner_or_admin",
        task: "Remove an Owner or Admin",
        cells: OWNERS,
      },
      {
        id: "leave",
        task: "Leave the business",
        cells: {
          OWNER: "Yes, unless last owner",
          ADMIN: "Yes",
          MEMBER: "Yes",
        },
      },
    ],
  },
  {
    label: "Selling",
    rows: [
      {
        id: "manage_holdings",
        task: "Add or adjust quota holdings",
        cells: MANAGERS,
      },
      {
        id: "manage_listings",
        task: "Create, edit, or cancel listings and auctions",
        cells: MANAGERS,
      },
    ],
  },
  {
    label: "Buying",
    rows: [
      {
        id: "buy",
        task: "Buy quota",
        cells: MANAGERS,
      },
      {
        id: "bid",
        task: "Bid on auctions",
        cells: MANAGERS,
      },
      {
        id: "pay",
        task: "Pay FQX for this business's orders",
        cells: MANAGERS,
      },
      {
        id: "cancel_unpaid_order",
        task: "Cancel an unpaid order",
        cells: MANAGERS,
      },
    ],
  },
];

export function privilegeAllows(
  row: Pick<PrivilegeRow, "cells">,
  role: OrganisationRole,
) {
  return row.cells[role] !== "No";
}

export function privilegeRowById(id: string) {
  for (const group of ORGANISATION_PRIVILEGE_GROUPS) {
    const row = group.rows.find((item) => item.id === id);
    if (row) {
      return row;
    }
  }

  return null;
}

export function privilegeRoleHeaders(): readonly OrganisationRole[] {
  return ["OWNER", "ADMIN", "MEMBER"];
}
