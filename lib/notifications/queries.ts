import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUserNotificationPreferences } from "@/lib/alerts/queries";
import {
  emailIsDisabled,
  isOperatorEmailId,
  type ProductEmailId,
} from "@/lib/email/product-emails";
import type { NoticeEmailData } from "@/lib/email/types";
import { inAppNotificationHref } from "@/lib/notifications/href";
import type { InAppNotification } from "@/lib/notifications/types";

async function db() {
  return createServiceClient() ?? (await createClient());
}

export async function insertInAppNotification(input: {
  email: string;
  template: ProductEmailId;
  data: NoticeEmailData;
}) {
  if (isOperatorEmailId(input.template)) {
    return;
  }

  const prefs = await getUserNotificationPreferences(input.email);

  if (emailIsDisabled(prefs.disabledInApp, input.template)) {
    return;
  }

  const supabase = await db();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc("insert_user_notification", {
    p_email: input.email,
    p_template: input.template,
    p_title: input.data.heading || input.data.subject,
    p_body: input.data.paragraphs[0] ?? input.data.preview ?? "",
    p_href: inAppNotificationHref(input.data.actionUrl),
  });

  if (error) {
    console.error("insertInAppNotification failed", error.message);
  }
}

export async function listMyInAppNotifications() {
  const supabase = await createClient();

  if (!supabase) {
    return [] as InAppNotification[];
  }

  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, template, title, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("listMyInAppNotifications failed", error.message);
    return [];
  }

  return (data ?? []) as InAppNotification[];
}

export async function getMyUnreadNotificationCount() {
  const supabase = await createClient();

  if (!supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) {
    console.error("getMyUnreadNotificationCount failed", error.message);
    return 0;
  }

  return count ?? 0;
}
