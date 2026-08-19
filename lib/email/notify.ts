import "server-only";

import { sendEmail, type EmailAttachment } from "@/lib/email/send";
import {
  actorAndAccountChannelEnabled,
  emailIsDisabled,
  type ProductEmailId,
} from "@/lib/email/product-emails";
import { getUserNotificationPreferences } from "@/lib/alerts/queries";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { NoticeEmailData, SendEmailResult } from "@/lib/email/types";
import {
  organisationNotificationEmails,
  organisationNotificationPreferences,
  uniqueEmails,
} from "@/lib/email/recipients";
import { insertInAppNotification } from "@/lib/notifications/queries";

export async function notifyEmail(
  template: ProductEmailId,
  to: string | string[] | null | undefined,
  data: NoticeEmailData,
  options?: {
    attachments?: EmailAttachment[];
    organisationId?: number;
  },
): Promise<SendEmailResult> {
  const recipients = uniqueEmails(Array.isArray(to) ? to : [to]);

  if (recipients.length === 0) {
    return { sent: false, skipped: true };
  }

  const accountPrefs = options?.organisationId
    ? await organisationNotificationPreferences(options.organisationId)
    : null;
  let result: SendEmailResult = { sent: false, skipped: true };

  for (const email of recipients) {
    try {
      result = await sendEmail({
        to: email,
        template,
        data,
        attachments: options?.attachments,
        accountDisabledEmails: accountPrefs?.disabledEmails,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email failed.";
      console.error("notifyEmail failed", template, message);
      result = { sent: false, error: message };
    }

    try {
      await insertInAppNotification({
        email,
        template,
        data,
        accountDisabledInApp: accountPrefs?.disabledInApp,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "In-app failed.";
      console.error("notifyEmail in-app failed", template, message);
    }
  }

  return result;
}

export async function notifyAccountEmail(
  template: ProductEmailId,
  organisationId: number,
  data: NoticeEmailData,
  extraTo?: Array<string | null | undefined>,
  attachments?: EmailAttachment[],
) {
  const to = uniqueEmails([
    ...(await organisationNotificationEmails(organisationId)),
    ...(extraTo ?? []),
  ]);

  return notifyEmail(template, to, data, { attachments, organisationId });
}

export async function notifyActorAndAccountEmail(
  template: ProductEmailId,
  organisationId: number,
  actorEmail: string | null | undefined,
  data: NoticeEmailData,
) {
  const roleEmails = await organisationNotificationEmails(organisationId);
  const actor = uniqueEmails([actorEmail]);
  const recipients = uniqueEmails([...roleEmails, ...actor]);

  if (recipients.length === 0) {
    return { sent: false, skipped: true };
  }

  const orgPrefs = await organisationNotificationPreferences(organisationId);
  let result: SendEmailResult = { sent: false, skipped: true };

  for (const email of recipients) {
    const userPrefs = await getUserNotificationPreferences(email);
    const sendEmailChannel = actorAndAccountChannelEnabled({
      email,
      actorEmail: actor[0],
      roleEmails,
      orgDisabled: emailIsDisabled(orgPrefs.disabledEmails, template),
      userDisabled: emailIsDisabled(userPrefs.disabledEmails, template),
    });
    const sendInAppChannel = actorAndAccountChannelEnabled({
      email,
      actorEmail: actor[0],
      roleEmails,
      orgDisabled: emailIsDisabled(orgPrefs.disabledInApp, template),
      userDisabled: emailIsDisabled(userPrefs.disabledInApp, template),
    });

    if (sendEmailChannel) {
      try {
        result = await sendEmail({
          to: email,
          template,
          data,
          accountDisabledEmails: [],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Email failed.";
        console.error("notifyActorAndAccountEmail failed", template, message);
        result = { sent: false, error: message };
      }
    }

    if (sendInAppChannel) {
      try {
        await insertInAppNotification({
          email,
          template,
          data,
          accountDisabledInApp: [],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "In-app failed.";
        console.error("notifyActorAndAccountEmail in-app failed", template, message);
      }
    }
  }

  return result;
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
