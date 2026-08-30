"use client";

import {
  tableBodyCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
  tableWrapClassName,
} from "@/components/data-table";
import {
  ORGANISATION_PRIVILEGE_GROUPS,
  privilegeRoleHeaders,
} from "@/lib/organisations/privileges";
import { organisationRoleLabel } from "@/lib/organisations/types";
import Link from "next/link";
import { Fragment } from "react";
import { accountSettingsPath } from "@/lib/organisations/paths";

function PrivilegeMark({ value }: { value: string }) {
  if (value === "No") {
    return (
      <span className="font-semibold text-red-800">
        <span aria-hidden="true">✕</span>
        <span className="sr-only">No</span>
      </span>
    );
  }

  if (value === "Yes") {
    return (
      <span className="font-semibold text-sea">
        <span aria-hidden="true">✓</span>
        <span className="sr-only">Yes</span>
      </span>
    );
  }

  if (value.startsWith("Yes, ")) {
    return (
      <span>
        <span className="font-semibold text-sea" aria-hidden="true">
          ✓
        </span>
        <span className="sr-only">Yes, </span> {value.slice("Yes, ".length)}
      </span>
    );
  }

  return value;
}

export function PrivilegesTable() {
  const roles = privilegeRoleHeaders();
  const columnCount = 1 + roles.length;

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-ink-muted">
        Roles are fixed. This list shows what each role can do for this
        business. Who receives business email is chosen on{" "}
        <Link href={accountSettingsPath("notifications")} className="underline">
          Notifications
        </Link>
        , not here.
      </p>
      <div className={tableWrapClassName}>
        <table className={`${tableClassName} table-fixed min-w-[40rem]`}>
          <caption className="sr-only">Role privileges</caption>
          <colgroup>
            <col />
            {roles.map((role) => (
              <col key={role} className="w-[12rem]" />
            ))}
          </colgroup>
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Task</th>
              {roles.map((role) => (
                <th key={role} className={tableHeaderCellClassName}>
                  {organisationRoleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ORGANISATION_PRIVILEGE_GROUPS.map((group) => (
              <Fragment key={group.label}>
                <tr>
                  <th
                    colSpan={columnCount}
                    scope="colgroup"
                    className="border-t border-line bg-paper px-3 py-3 text-left text-sm font-medium text-ink"
                  >
                    {group.label}
                  </th>
                </tr>
                {group.rows.map((item, index) => (
                  <tr key={item.id} className={tableRowClassName(index)}>
                    <td className={tableBodyCellClassName}>{item.task}</td>
                    {roles.map((role) => (
                      <td key={role} className={tableBodyCellClassName}>
                        <PrivilegeMark value={item.cells[role]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
