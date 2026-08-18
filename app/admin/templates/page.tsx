import Link from "next/link";
import { redirect } from "next/navigation";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { isPlatformAdmin } from "@/lib/admin/access";
import { emailIsDisabled } from "@/lib/email/product-emails";
import { getPlatformSettings } from "@/lib/settings/queries";
import { listMessageTemplates } from "@/lib/templates/catalog";

export const metadata = {
  title: "Templates",
};

export default async function AdminTemplatesPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const settings = await getPlatformSettings();
  const templates = listMessageTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Email and PDF templates
        </h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          Preview sample content for each transactional email and PDF. These are
          not sent from this page. Auth confirm and password reset stay on
          Supabase Auth and are not listed here.
        </p>
      </div>
      <DataTable
        caption="Templates"
        empty="No templates."
        searchPlaceholder="Filter templates…"
        defaultPageSize={50}
        columns={[
          { key: "name", header: "Template", sortable: true },
          { key: "kind", header: "Type", sortable: true, filter: "select" },
          {
            key: "admin",
            header: "Admin",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "enabled", label: "Enabled" },
              { value: "disabled", label: "Disabled" },
            ],
          },
          { key: "sentWhen", header: "Sent when" },
        ]}
        rows={templates.map((template) => {
          const disabled =
            template.kind === "email" &&
            emailIsDisabled(settings.disabled_emails, template.id);
          const admin = template.kind === "email"
            ? disabled
              ? "disabled"
              : "enabled"
            : "—";

          return {
            id: template.id,
            values: {
              name: template.name,
              kind: template.kind === "email" ? "Email" : "PDF",
              admin,
              sentWhen: template.summary,
            },
            display: {
              admin:
                admin === "enabled"
                  ? "Enabled"
                  : admin === "disabled"
                    ? "Disabled"
                    : "—",
            },
          };
        })}
      >
        {templates.map((template) => (
          <DataTableRowExtras
            key={template.id}
            id={template.id}
            links={
              <Link
                href={`/admin/templates/${template.id}`}
                className={tableLinkClassName}
              >
                Preview
              </Link>
            }
          />
        ))}
      </DataTable>
    </div>
  );
}
