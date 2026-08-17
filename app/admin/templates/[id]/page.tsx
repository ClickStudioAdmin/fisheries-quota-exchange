import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LabeledFields, panelClassName } from "@/components/surface";
import { tableLinkClassName } from "@/components/data-table";
import { isPlatformAdmin } from "@/lib/admin/access";
import { emailSubject, renderEmailHtml } from "@/lib/email/render";
import { getSiteUrl } from "@/lib/site-url";
import {
  getMessageTemplate,
  isMessageTemplateId,
  sampleContentFields,
  sampleEmailData,
} from "@/lib/templates/catalog";

type TemplatePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: TemplatePageProps) {
  const { id } = await params;
  const template = getMessageTemplate(id);
  return {
    title: template ? template.name : "Template",
  };
}

export default async function AdminTemplatePage({ params }: TemplatePageProps) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const { id } = await params;

  if (!isMessageTemplateId(id)) {
    notFound();
  }

  const template = getMessageTemplate(id);

  if (!template) {
    notFound();
  }

  const siteUrl =
    (await getSiteUrl()) ?? "https://fisheries-quota-exchange.vercel.app";
  const fields = sampleContentFields(id, siteUrl);
  let subject: string | null = null;
  let html: string | null = null;

  if (id === "member_added") {
    const data = sampleEmailData("member_added", siteUrl);
    subject = emailSubject("member_added", data);
    html = await renderEmailHtml("member_added", data);
  } else if (id === "order_settled") {
    const data = sampleEmailData("order_settled", siteUrl);
    subject = emailSubject("order_settled", data);
    html = await renderEmailHtml("order_settled", data);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm">
          <Link href="/admin/templates" className={tableLinkClassName}>
            Templates
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {template.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          {template.description} Sample data is shown below. This page does not
          send mail.
        </p>
      </div>

      <div className={panelClassName}>
        <LabeledFields
          columns={2}
          items={[
            { label: "Type", value: template.kind === "email" ? "Email" : "PDF" },
            { label: "ID", value: template.id },
            { label: "Source", value: template.source },
            {
              label: "Attachments",
              value:
                template.attachments.length > 0
                  ? template.attachments.join(", ")
                  : "None",
            },
          ]}
        />
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              Sent when
            </dt>
            <dd className="mt-0.5 text-ink">{template.sentWhen}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              Recipient
            </dt>
            <dd className="mt-0.5 text-ink">{template.recipient}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              Trigger
            </dt>
            <dd className="mt-0.5 text-ink">{template.trigger}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              Skipped when
            </dt>
            <dd className="mt-0.5 text-ink">{template.skipWhen}</dd>
          </div>
        </dl>
        {template.related.length > 0 ? (
          <p className="mt-4 text-sm text-ink">
            Related:{" "}
            {template.related.map((item, index) => (
              <span key={item.id}>
                {index > 0 ? ", " : null}
                <Link
                  href={`/admin/templates/${item.id}`}
                  className={tableLinkClassName}
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <div className={panelClassName}>
        <h2 className="text-lg font-medium text-ink">Sample content</h2>
        {subject ? (
          <p className="mt-3 text-sm text-ink">
            <span className="text-ink-muted">Subject: </span>
            {subject}
          </p>
        ) : null}
        <div className="mt-4">
          <LabeledFields columns={2} items={fields} />
        </div>
      </div>

      <div className={panelClassName}>
        <h2 className="text-lg font-medium text-ink">Preview</h2>
        {template.kind === "email" && html ? (
          <iframe
            title={`${template.name} preview`}
            srcDoc={html}
            sandbox=""
            className="mt-4 h-[40rem] w-full border border-line bg-white"
          />
        ) : null}
        {template.kind === "pdf" ? (
          <iframe
            title={`${template.name} preview`}
            src={`/admin/templates/${template.id}/pdf`}
            className="mt-4 h-[52rem] w-full border border-line bg-white"
          />
        ) : null}
      </div>

      {html ? (
        <details className={panelClassName}>
          <summary className="cursor-pointer text-sm font-medium text-ink">
            HTML source
          </summary>
          <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-all text-xs text-ink">
            {html}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
