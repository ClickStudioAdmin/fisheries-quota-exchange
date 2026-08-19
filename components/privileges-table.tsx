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
import { accountSettingsPath } from "@/lib/organisations/paths";

export function PrivilegesTable() {
  const roles = privilegeRoleHeaders();

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-ink-muted">
        Roles are fixed. This list shows what each role can do for this
        business. Who receives business email is chosen on{" "}
        <Link href={accountSettingsPath("notifications")} className="underline">
          Notifications
        </Link>
        , not here.
      </p>
      {ORGANISATION_PRIVILEGE_GROUPS.map((group) => (
        <section key={group.label} className="space-y-3">
          <h2 className="text-sm font-medium text-ink">{group.label}</h2>
          <div className={tableWrapClassName}>
            <table className={tableClassName}>
              <caption className="sr-only">{group.label} privileges</caption>
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
                {group.rows.map((item, index) => (
                  <tr key={item.id} className={tableRowClassName(index)}>
                    <td className={tableBodyCellClassName}>{item.task}</td>
                    {roles.map((role) => (
                      <td key={role} className={tableBodyCellClassName}>
                        {item.cells[role]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
