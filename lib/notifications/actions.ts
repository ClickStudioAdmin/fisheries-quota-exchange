"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeAppPath } from "@/lib/notifications/href";
import { createClient, getUser } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/errors/user-message";

export async function markNotificationsReadAction(formData: FormData) {
  const user = await getUser();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return;
  }

  const rawId = Number(formData.get("id"));
  const ids = Number.isInteger(rawId) && rawId > 0 ? [rawId] : null;
  const { error } = await supabase.rpc("mark_user_notifications_read", {
    p_ids: ids,
  });

  if (error) {
    console.error("markNotificationsReadAction failed", userFacingError(error));
  }

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}

export async function openNotificationAction(formData: FormData) {
  await markNotificationsReadAction(formData);
  redirect(safeAppPath(String(formData.get("href") ?? "")));
}
