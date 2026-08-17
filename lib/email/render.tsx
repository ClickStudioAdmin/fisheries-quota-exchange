import "server-only";

import { render } from "@react-email/components";
import { MemberAddedEmail } from "@/lib/email/templates/member-added";
import { OrderSettledEmail } from "@/lib/email/templates/order-settled";
import type { EmailTemplate, EmailTemplates } from "@/lib/email/types";

export function emailSubject<K extends EmailTemplate>(
  template: K,
  data: EmailTemplates[K],
) {
  switch (template) {
    case "member_added": {
      const member = data as EmailTemplates["member_added"];
      return `You have been added to ${member.accountName} on FQX`;
    }
    case "order_settled": {
      const order = data as EmailTemplates["order_settled"];
      return `Simulated tax invoice for FQX order ${order.orderId}`;
    }
    default:
      return "Fisheries Quota Exchange";
  }
}

export function renderEmailTemplate<K extends EmailTemplate>(
  template: K,
  data: EmailTemplates[K],
) {
  switch (template) {
    case "member_added":
      return <MemberAddedEmail {...(data as EmailTemplates["member_added"])} />;
    case "order_settled":
      return <OrderSettledEmail {...(data as EmailTemplates["order_settled"])} />;
    default:
      return null;
  }
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
