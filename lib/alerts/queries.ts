import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ListingAlert } from "@/lib/alerts/types";
import { listingAlertMatches } from "@/lib/alerts/types";
import type { ListingOffering } from "@/lib/listings/types";
import { uniqueEmails } from "@/lib/email/recipients";
import {
  profileNotificationEmailIds,
} from "@/lib/email/product-emails";
import type { NotificationPreferences } from "@/lib/notifications/types";

async function db() {
  return createServiceClient() ?? (await createClient());
}

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function asPreferences(row: {
  disabled_emails?: unknown;
  disabled_in_app?: unknown;
} | null): NotificationPreferences {
  return {
    disabledEmails: asStringList(row?.disabled_emails),
    disabledInApp: asStringList(row?.disabled_in_app),
  };
}

export async function getUserNotificationPreferences(email: string) {
  const supabase = await db();
  const key = email.trim().toLowerCase();

  if (!supabase || !key.includes("@")) {
    return asPreferences(null);
  }

  const { data, error } = await supabase
    .from("user_email_preferences")
    .select("disabled_emails, disabled_in_app")
    .eq("email", key)
    .maybeSingle();

  if (error) {
    console.error("getUserNotificationPreferences failed", error.message);
    return asPreferences(null);
  }

  return asPreferences(data);
}

export async function getUserDisabledEmails(email: string) {
  return (await getUserNotificationPreferences(email)).disabledEmails;
}

export async function getMyNotificationPreferences() {
  const supabase = await createClient();

  if (!supabase) {
    return asPreferences(null);
  }

  const { data, error } = await supabase
    .from("user_email_preferences")
    .select("disabled_emails, disabled_in_app")
    .maybeSingle();

  if (error) {
    console.error("getMyNotificationPreferences failed", error.message);
    return asPreferences(null);
  }

  return asPreferences(data);
}

export async function listMyListingAlerts() {
  const supabase = await createClient();

  if (!supabase) {
    return [] as ListingAlert[];
  }

  const { data, error } = await supabase
    .from("listing_alerts")
    .select("fishery_id, sales, leases");

  if (error) {
    console.error("listMyListingAlerts failed", error.message);
    return [];
  }

  return (data ?? []) as ListingAlert[];
}

export async function listingAlertEmails(
  fisheryId: number,
  offering: ListingOffering,
) {
  const supabase = await db();

  if (!supabase || !Number.isInteger(fisheryId)) {
    return [];
  }

  const { data, error } = await supabase
    .from("listing_alerts")
    .select("email, sales, leases")
    .eq("fishery_id", fisheryId);

  if (error) {
    console.error("listingAlertEmails failed", error.message);
    return [];
  }

  return uniqueEmails(
    (data ?? [])
      .filter((row) =>
        listingAlertMatches(
          {
            sales: Boolean(row.sales),
            leases: Boolean(row.leases),
          },
          offering,
        ),
      )
      .map((row) => String(row.email ?? "")),
  );
}

export async function myProfileNotificationEmailIds() {
  return profileNotificationEmailIds();
}
