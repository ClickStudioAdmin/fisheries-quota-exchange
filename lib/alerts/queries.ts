import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ListingAlert } from "@/lib/alerts/types";
import { listingAlertMatches } from "@/lib/alerts/types";
import type { ListingOffering } from "@/lib/listings/types";
import { uniqueEmails } from "@/lib/email/recipients";

async function db() {
  return createServiceClient() ?? (await createClient());
}

export async function getUserDisabledEmails(email: string) {
  const supabase = await db();
  const key = email.trim().toLowerCase();

  if (!supabase || !key.includes("@")) {
    return [] as string[];
  }

  const { data, error } = await supabase
    .from("user_email_preferences")
    .select("disabled_emails")
    .eq("email", key)
    .maybeSingle();

  if (error) {
    console.error("getUserDisabledEmails failed", error.message);
    return [];
  }

  return Array.isArray(data?.disabled_emails)
    ? data.disabled_emails.map(String)
    : [];
}

export async function getMyDisabledEmails() {
  const supabase = await createClient();

  if (!supabase) {
    return [] as string[];
  }

  const { data, error } = await supabase
    .from("user_email_preferences")
    .select("disabled_emails")
    .maybeSingle();

  if (error) {
    console.error("getMyDisabledEmails failed", error.message);
    return [];
  }

  return Array.isArray(data?.disabled_emails)
    ? data.disabled_emails.map(String)
    : [];
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
