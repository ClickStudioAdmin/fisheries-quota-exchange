import "server-only";

import { sendEmail, type EmailAttachment } from "@/lib/email/send";
import type { ProductEmailId } from "@/lib/email/product-emails";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { NoticeEmailData } from "@/lib/email/types";
import { uniqueEmails } from "@/lib/email/recipients";

export async function notifyEmail(
  template: ProductEmailId,
  to: string | string[] | null | undefined,
  data: NoticeEmailData,
  attachments?: EmailAttachment[],
) {
  const recipients = uniqueEmails(Array.isArray(to) ? to : [to]);

  for (const email of recipients) {
    try {
      await sendEmail({
        to: email,
        template,
        data,
        attachments,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email failed.";
      console.error("notifyEmail failed", template, message);
    }
  }
}

export async function siteUrlOrEmpty() {
  return (await getSiteUrl()) ?? "";
}

export async function claimEmailDispatch(template: string, entityKey: string) {
  const supabase = createServiceClient() ?? (await createClient());

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc("claim_email_dispatch", {
    p_template: template,
    p_entity_key: entityKey,
  });

  if (error) {
    console.error("claim_email_dispatch failed", error.message);
    return false;
  }

  return data === true;
}
