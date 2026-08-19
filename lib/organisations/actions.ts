"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/errors/user-message";
import {
  canAddMember,
  canAssignRole,
  canChangeMemberRole,
  canRemoveMember,
} from "@/lib/organisations/permissions";
import { getMyRole, getOrganisationLegalName } from "@/lib/organisations/queries";
import { accountPath } from "@/lib/organisations/paths";
import {
  isOrganisationRole,
  organisationRoleLabel,
} from "@/lib/organisations/types";
import { emailCopy } from "@/lib/email/copy";
import { notifyEmail, siteUrlOrEmpty } from "@/lib/email/notify";
import { getSiteUrl } from "@/lib/site-url";

export type OrganisationFormState = {
  error?: string;
  message?: string;
};

function readText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function readAbn(value: string) {
  const abn = value.replace(/\s/g, "");

  if (!abn) {
    return { abn: null } as const;
  }

  if (!/^\d{11}$/.test(abn)) {
    return { error: "ABN must be 11 digits if provided." } as const;
  }

  return { abn } as const;
}

export async function createOrganisationAction(
  _prev: OrganisationFormState,
  formData: FormData,
): Promise<OrganisationFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." };
  }

  const legalName = readText(formData, "legal_name");
  const tradingName = readText(formData, "trading_name");
  const abnResult = readAbn(readText(formData, "abn"));

  if (!legalName) {
    return { error: "Legal name is required." };
  }

  if ("error" in abnResult) {
    return { error: abnResult.error };
  }

  const { data, error } = await supabase.rpc("create_organisation", {
    p_legal_name: legalName,
    p_trading_name: tradingName,
    p_abn: abnResult.abn,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  redirect(accountPath(Number(data)));
}

export async function addMemberAction(
  _prev: OrganisationFormState,
  formData: FormData,
): Promise<OrganisationFormState> {
  const supabase = await createClient();
  const organisationId = Number(formData.get("organisation_id"));
  const email = readText(formData, "email").toLowerCase();
  const memberRole = readText(formData, "role");

  if (!supabase || !Number.isInteger(organisationId)) {
    return { error: "Organisation not found." };
  }

  if (!email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  if (!isOrganisationRole(memberRole)) {
    return { error: "Choose a valid role." };
  }

  const actorRole = await getMyRole(organisationId);

  if (!actorRole || !canAddMember(actorRole)) {
    return { error: "You do not have permission to add members." };
  }

  if (!canAssignRole(actorRole, memberRole)) {
    return { error: "You cannot assign that role." };
  }

  const { error } = await supabase.from("organisation_users").insert({
    organisation_id: organisationId,
    email,
    role: memberRole,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");

  const siteUrl = await getSiteUrl();
  const accountName =
    (await getOrganisationLegalName(organisationId)) ?? "an FQX account";
  const mail = await notifyEmail(
    "member_added",
    email,
    emailCopy.member_added({
      accountName,
      role: organisationRoleLabel(memberRole),
      registerUrl: siteUrl ? `${siteUrl}/register` : "/register",
      loginUrl: siteUrl ? `${siteUrl}/login` : "/login",
    }),
  );

  if (mail.sent) {
    return { message: "Member added. An invitation email was sent." };
  }

  if ("skipped" in mail && mail.skipped) {
    return { message: "Member added." };
  }

  return {
    message: "Member added. The invitation email could not be sent.",
  };
}

export type MemberActionState = {
  error?: string;
  message?: string;
  left?: boolean;
};

function readPositiveInt(formData: FormData, name: string) {
  const value = Number(String(formData.get(name) ?? "").trim());

  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

export async function updateMemberRoleAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const supabase = await createClient();
  const organisationId = readPositiveInt(formData, "organisation_id");
  const memberId = readPositiveInt(formData, "member_id");
  const memberRole = String(formData.get("role") ?? "");

  if (!supabase || organisationId == null || memberId == null) {
    return { error: "Could not update that role." };
  }

  if (!isOrganisationRole(memberRole)) {
    return { error: "Choose a valid role." };
  }

  const actorRole = await getMyRole(organisationId);

  if (!actorRole || !canChangeMemberRole(actorRole)) {
    return { error: "You do not have permission to change roles." };
  }

  const { data: member } = await supabase
    .from("organisation_users")
    .select("email, role")
    .eq("id", memberId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("organisation_users")
    .update({ role: memberRole })
    .eq("id", memberId)
    .eq("organisation_id", organisationId)
    .select("id");

  if (error) {
    return { error: userFacingError(error) };
  }

  if (!data?.length) {
    return { error: "Could not update that role." };
  }

  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");

  const siteUrl = await siteUrlOrEmpty();
  const accountName =
    (await getOrganisationLegalName(organisationId)) ?? "an FQX account";
  const memberEmail = String(member?.email ?? "");
  if (memberRole === "OWNER") {
    await notifyEmail(
      "ownership_transferred",
      memberEmail,
      emailCopy.ownership_transferred({
        accountName,
        accountUrl: `${siteUrl}${accountPath(organisationId)}`,
      }),
    );
  } else {
    await notifyEmail(
      "member_role_changed",
      memberEmail,
      emailCopy.member_role_changed({
        accountName,
        role: organisationRoleLabel(memberRole),
        accountUrl: `${siteUrl}${accountPath(organisationId)}`,
      }),
    );
  }

  return { message: "Role updated." };
}

export async function removeMemberAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const user = await getUser();
  const supabase = await createClient();
  const organisationId = readPositiveInt(formData, "organisation_id");
  const memberId = readPositiveInt(formData, "member_id");
  const targetRole = String(formData.get("target_role") ?? "");
  const targetEmail = String(formData.get("target_email") ?? "").toLowerCase();

  if (
    !user?.email ||
    !supabase ||
    organisationId == null ||
    memberId == null ||
    !isOrganisationRole(targetRole)
  ) {
    return { error: "Could not remove that person." };
  }

  const actorRole = await getMyRole(organisationId);
  const isSelf = targetEmail === user.email.toLowerCase();
  const { count: ownerCount } = await supabase
    .from("organisation_users")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .eq("role", "OWNER");

  if (
    !actorRole ||
    !canRemoveMember(actorRole, targetRole, isSelf, ownerCount ?? 0)
  ) {
    return { error: "You do not have permission to remove that person." };
  }

  const { error } = await supabase
    .from("organisation_users")
    .delete()
    .eq("id", memberId)
    .eq("organisation_id", organisationId);

  if (error) {
    return { error: userFacingError(error) };
  }

  const { data: remaining } = await supabase
    .from("organisation_users")
    .select("id")
    .eq("id", memberId)
    .maybeSingle();

  if (remaining) {
    return { error: "Could not remove that person." };
  }

  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");

  if (isSelf) {
    return { left: true, message: "You left the account." };
  }

  const siteUrl = await siteUrlOrEmpty();
  const accountName =
    (await getOrganisationLegalName(organisationId)) ?? "an FQX account";
  await notifyEmail(
    "member_removed",
    targetEmail,
    emailCopy.member_removed({
      accountName,
      siteUrl: siteUrl || "https://fisheries-quota-exchange.vercel.app",
    }),
  );

  return { message: "Person removed." };
}
