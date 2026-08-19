"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeAppPath } from "@/lib/notifications/href";
import { createClient, getUser } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/errors/user-message";

function notificationIdsFrom(formData: FormData) {
  const values = [...formData.getAll("ids"), ...formData.getAll("id")];
  const ids = values
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);

  return [...new Set(ids)];
}

async function refreshInbox() {
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}

export async function markNotificationsReadAction(formData: FormData) {
  const user = await getUser();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return;
  }

  const markAll = String(formData.get("scope") ?? "") === "all";
  const ids = notificationIdsFrom(formData);

  if (!markAll && ids.length === 0) {
    return;
  }

  const { error } = await supabase.rpc("mark_user_notifications_read", {
    p_ids: markAll ? null : ids,
  });

  if (error) {
    console.error("markNotificationsReadAction failed", userFacingError(error));
  }

  await refreshInbox();
}

export async function markNotificationsUnreadAction(formData: FormData) {
  const user = await getUser();
  const supabase = await createClient();
  const ids = notificationIdsFrom(formData);

  if (!user?.email || !supabase || ids.length === 0) {
    return;
  }

  const { error } = await supabase.rpc("mark_user_notifications_unread", {
    p_ids: ids,
  });

  if (error) {
    console.error(
      "markNotificationsUnreadAction failed",
      userFacingError(error),
    );
  }

  await refreshInbox();
}

export async function openNotificationAction(formData: FormData) {
  await markNotificationsReadAction(formData);
  redirect(safeAppPath(String(formData.get("href") ?? "")));
}
