"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getMyDisabledEmails } from "@/lib/alerts/queries";
import { parseFisheryIds } from "@/lib/alerts/types";
import {
  MEMBER_EMAIL_IDS,
  PRODUCT_EMAIL_IDS,
  disabledProductEmails,
  isProductEmailId,
} from "@/lib/email/product-emails";
import { createClient, getUser } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/errors/user-message";

export type PreferenceFormState = {
  error?: string;
  message?: string;
};

export async function updateNotificationPreferencesAction(
  _prev: PreferenceFormState,
  formData: FormData,
): Promise<PreferenceFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return { error: "You must be signed in." };
  }

  const visibleIds = (await isPlatformAdmin())
    ? [...PRODUCT_EMAIL_IDS]
    : [...MEMBER_EMAIL_IDS];
  const visible = new Set(visibleIds);
  const formDisabled = disabledProductEmails(
    formData.getAll("email_enabled").map((value) => String(value)),
    visibleIds,
  );
  const preserved = (await getMyDisabledEmails()).filter(
    (id) => isProductEmailId(id) && !visible.has(id),
  );

  const { error } = await supabase.rpc("update_user_email_preferences", {
    p_disabled_emails: [...new Set([...formDisabled, ...preserved])],
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard/notifications");
  return { message: "Notification preferences saved." };
}

export async function updateListingAlertsAction(
  _prev: PreferenceFormState,
  formData: FormData,
): Promise<PreferenceFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase.rpc("replace_listing_alerts", {
    p_sales: parseFisheryIds(formData.getAll("sale")),
    p_leases: parseFisheryIds(formData.getAll("lease")),
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard/alerts");
  return { message: "Alerts saved." };
}
