import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseDisabledProductEmails } from "@/lib/email/product-emails";
import { parseNotificationRoles } from "@/lib/organisations/notification-roles";

async function db() {
  return createServiceClient() ?? (await createClient());
}

export async function organisationManagerEmails(organisationId: number) {
  return organisationNotificationEmails(organisationId, ["OWNER", "ADMIN"]);
}

export async function organisationNotificationEmails(
  organisationId: number,
  roles?: readonly string[],
) {
  const supabase = await db();

  if (!supabase || !Number.isInteger(organisationId)) {
    return [];
  }

  let allowed = roles;

  if (!allowed) {
    const { data: organisation } = await supabase
      .from("organisations")
      .select("notification_roles")
      .eq("id", organisationId)
      .maybeSingle();
    allowed = parseNotificationRoles(organisation?.notification_roles);
  }

  const { data } = await supabase
    .from("organisation_users")
    .select("email, role")
    .eq("organisation_id", organisationId)
    .in("role", [...allowed]);

  const emails = uniqueEmails(
    (data ?? []).map((row) => String(row.email ?? "")),
  );

  if (emails.length > 0) {
    return emails;
  }

  const { data: owners } = await supabase
    .from("organisation_users")
    .select("email")
    .eq("organisation_id", organisationId)
    .eq("role", "OWNER");

  return uniqueEmails((owners ?? []).map((row) => String(row.email ?? "")));
}

export async function organisationMemberEmails(organisationId: number) {
  const supabase = await db();

  if (!supabase || !Number.isInteger(organisationId)) {
    return [];
  }

  const { data } = await supabase
    .from("organisation_users")
    .select("email")
    .eq("organisation_id", organisationId);

  return uniqueEmails(
    (data ?? []).map((row) => String(row.email ?? "")),
  );
}

export async function platformAdminEmails() {
  const supabase = await db();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase.from("platform_admins").select("email");

  return uniqueEmails(
    (data ?? []).map((row) => String(row.email ?? "")),
  );
}

export async function organisationNotificationPreferences(organisationId: number) {
  const supabase = await db();

  if (!supabase || !Number.isInteger(organisationId)) {
    return {
      disabledEmails: [] as ReturnType<typeof parseDisabledProductEmails>,
      disabledInApp: [] as ReturnType<typeof parseDisabledProductEmails>,
    };
  }

  const { data } = await supabase
    .from("organisations")
    .select("disabled_notification_emails, disabled_notification_in_app")
    .eq("id", organisationId)
    .maybeSingle();

  return {
    disabledEmails: parseDisabledProductEmails(data?.disabled_notification_emails),
    disabledInApp: parseDisabledProductEmails(data?.disabled_notification_in_app),
  };
}

export function uniqueEmails(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values
        .map((value) => value?.trim().toLowerCase() ?? "")
        .filter((value) => value.includes("@")),
    ),
  ];
}
