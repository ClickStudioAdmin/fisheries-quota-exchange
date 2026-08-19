import "server-only";

import { Resend } from "resend";
import { getEmailEnv } from "@/lib/email/env";
import { emailSubject, renderEmailTemplate } from "@/lib/email/render";
import {
  emailIsDisabled,
  isOperatorEmailId,
  type ProductEmailId,
} from "@/lib/email/product-emails";
import { getUserDisabledEmails } from "@/lib/alerts/queries";
import { getPlatformSettings } from "@/lib/settings/queries";
import type { EmailTemplates, SendEmailResult } from "@/lib/email/types";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
};

export async function sendEmail<K extends ProductEmailId>(options: {
  to: string;
  template: K;
  data: EmailTemplates[K];
  attachments?: EmailAttachment[];
}): Promise<SendEmailResult> {
  const settings = await getPlatformSettings();

  if (emailIsDisabled(settings.disabled_emails, options.template)) {
    return { sent: false, skipped: true };
  }

  const to = options.to.trim().toLowerCase();

  if (!to.includes("@")) {
    return { sent: false, error: "Invalid recipient." };
  }

  if (!isOperatorEmailId(options.template)) {
    const userDisabled = await getUserDisabledEmails(to);

    if (emailIsDisabled(userDisabled, options.template)) {
      return { sent: false, skipped: true };
    }
  }

  const env = getEmailEnv();

  if (!env) {
    return { sent: false, skipped: true };
  }

  const react = renderEmailTemplate(options.template, options.data);

  if (!react) {
    return { sent: false, error: "Unknown email template." };
  }

  try {
    const resend = new Resend(env.apiKey);
    const { error } = await resend.emails.send({
      from: env.from,
      to,
      subject: emailSubject(options.template, options.data),
      react,
      attachments: options.attachments?.map((file) => ({
        filename: file.filename,
        content: file.content.toString("base64"),
      })),
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
