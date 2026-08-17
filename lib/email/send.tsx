import "server-only";

import { Resend } from "resend";
import { getEmailEnv } from "@/lib/email/env";
import { MemberAddedEmail } from "@/lib/email/templates/member-added";
import type {
  EmailTemplate,
  EmailTemplates,
  SendEmailResult,
} from "@/lib/email/types";

function subjectFor<K extends EmailTemplate>(
  template: K,
  data: EmailTemplates[K],
) {
  switch (template) {
    case "member_added": {
      const member = data as EmailTemplates["member_added"];
      return `You have been added to ${member.accountName} on FQX`;
    }
    default:
      return "Fisheries Quota Exchange";
  }
}

function renderTemplate<K extends EmailTemplate>(
  template: K,
  data: EmailTemplates[K],
) {
  switch (template) {
    case "member_added":
      return <MemberAddedEmail {...(data as EmailTemplates["member_added"])} />;
    default:
      return null;
  }
}

export async function sendEmail<K extends EmailTemplate>(options: {
  to: string;
  template: K;
  data: EmailTemplates[K];
}): Promise<SendEmailResult> {
  const env = getEmailEnv();

  if (!env) {
    return { sent: false, skipped: true };
  }

  const to = options.to.trim().toLowerCase();

  if (!to.includes("@")) {
    return { sent: false, error: "Invalid recipient." };
  }

  const react = renderTemplate(options.template, options.data);

  if (!react) {
    return { sent: false, error: "Unknown email template." };
  }

  try {
    const resend = new Resend(env.apiKey);
    const { error } = await resend.emails.send({
      from: env.from,
      to,
      subject: subjectFor(options.template, options.data),
      react,
    });

    if (error) {
      console.error("sendEmail failed", error.message);
      return { sent: false, error: error.message };
    }

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email failed.";
    console.error("sendEmail failed", message);
    return { sent: false, error: message };
  }
}
