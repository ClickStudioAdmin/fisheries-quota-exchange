import "server-only";

import { render } from "@react-email/components";
import { NoticeEmail } from "@/lib/email/templates/notice";
import type { EmailTemplate, EmailTemplates } from "@/lib/email/types";

export function emailSubject<K extends EmailTemplate>(
  template: K,
  data: EmailTemplates[K],
) {
  return data.subject || "Fisheries Quota Exchange";
}

export function renderEmailTemplate<K extends EmailTemplate>(
  template: K,
  data: EmailTemplates[K],
) {
  void template;
  return <NoticeEmail {...data} />;
}

export async function renderEmailHtml<K extends EmailTemplate>(
  template: K,
  data: EmailTemplates[K],
) {
  const react = renderEmailTemplate(template, data);

  if (!react) {
    return null;
  }

  return render(react);
}
