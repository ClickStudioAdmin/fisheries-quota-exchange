"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/errors/user-message";
import {
  canAddMember,
  canAssignRole,
  canCancelInvitation,
  canChangeMemberRole,
  canEditOrganisation,
  canRemoveMember,
} from "@/lib/organisations/permissions";
import { notificationRolesFromForm } from "@/lib/organisations/notification-roles";
import {
  getMyRole,
  getOrganisationLegalName,
} from "@/lib/organisations/queries";
import { accountPath, invitationPath, isInvitationToken } from "@/lib/organisations/paths";
import {
  requireActiveOrganisationMatch,
  setActiveOrganisationCookie,
} from "@/lib/organisations/active-session";
import {
  isEntityKind,
  isOrganisationRole,
  organisationRoleLabel,
} from "@/lib/organisations/types";
import { readAustralianAddress } from "@/lib/organisations/address";
import { emailCopy } from "@/lib/email/copy";
import {
  ACCOUNT_NOTIFICATION_EMAIL_IDS,
  disabledProductEmails,
} from "@/lib/email/product-emails";
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

function readAcn(value: string) {
  const acn = value.replace(/\s/g, "");

  if (!acn) {
    return { acn: null } as const;
  }

  if (!/^\d{9}$/.test(acn)) {
    return { error: "ACN must be 9 digits if provided." } as const;
  }

  return { acn } as const;
}

function readMobile(value: string) {
  const mobile = value.trim();

  if (!mobile) {
    return { mobile: null } as const;
  }

  const digits = mobile.replace(/\D/g, "");

  if (digits.length < 8) {
    return { error: "Enter a valid phone number." } as const;
  }

  return { mobile } as const;
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
  revalidatePath("/dashboard/account");
  const organisationId = Number(data);

  if (Number.isInteger(organisationId) && organisationId > 0) {
    await setActiveOrganisationCookie(organisationId);
  }

  redirect("/dashboard");
}

export async function updateOrganisationDetailsAction(
  _prev: OrganisationFormState,
  formData: FormData,
): Promise<OrganisationFormState> {
  const supabase = await createClient();
  const organisationId = Number(formData.get("organisation_id"));
  const legalName = readText(formData, "legal_name");
  const tradingName = readText(formData, "trading_name");
  const hideIdentity = formData.get("hide_identity") === "on";
  const entityKindRaw = readText(formData, "entity_kind");
  const mobileResult = readMobile(readText(formData, "mobile"));
  const registeredResult = readAustralianAddress(formData, "registered");
  const postalDifferent = formData.get("postal_different") === "on";
  const qldJurisdictionId = Number(formData.get("qld_jurisdiction_id"));
  const clientReference = readText(formData, "qld_client_reference");
  const licenceNumber = readText(formData, "qld_licence_number");
  const fisherySymbols = readText(formData, "qld_fishery_symbols");
  const abnResult = readAbn(readText(formData, "abn"));
  const company = entityKindRaw === "COMPANY";
  const acnResult = company
    ? readAcn(readText(formData, "acn"))
    : ({ acn: null } as const);

  if (!supabase || !Number.isInteger(organisationId)) {
    return { error: "Organisation not found." };
  }

  const mismatch = await requireActiveOrganisationMatch(organisationId);

  if (mismatch) {
    return { error: mismatch };
  }

  if (!legalName) {
    return { error: "Legal name is required." };
  }

  if (entityKindRaw && !isEntityKind(entityKindRaw)) {
    return { error: "Choose a valid entity kind." };
  }

  if ("error" in abnResult) {
    return { error: abnResult.error };
  }

  if ("error" in acnResult) {
    return { error: acnResult.error };
  }

  if ("error" in mobileResult) {
    return { error: mobileResult.error };
  }

  if ("error" in registeredResult) {
    return { error: registeredResult.error };
  }

  let postalAddress = registeredResult.address;
  if (postalDifferent) {
    const postalResult = readAustralianAddress(formData, "postal");
    if ("error" in postalResult) {
      return { error: postalResult.error };
    }
    postalAddress = postalResult.address;
  }

  const actorRole = await getMyRole(organisationId);

  if (!actorRole || !canEditOrganisation(actorRole)) {
    return { error: "You do not have permission to edit business details." };
  }

  const { error } = await supabase
    .from("organisations")
    .update({
      legal_name: legalName,
      trading_name: tradingName || null,
      abn: abnResult.abn,
      hide_identity: hideIdentity,
      entity_kind: entityKindRaw || null,
      acn: acnResult.acn,
      mobile: mobileResult.mobile,
      registered_address: registeredResult.address,
      postal_address: postalDifferent ? postalAddress : registeredResult.address,
      postal_same_as_registered: !postalDifferent,
    })
    .eq("id", organisationId);

  if (error) {
    return { error: userFacingError(error) };
  }

  if (Number.isInteger(qldJurisdictionId) && qldJurisdictionId > 0) {
    const { error: profileError } = await supabase
      .from("organisation_jurisdiction_profiles")
      .upsert(
        {
          organisation_id: organisationId,
          jurisdiction_id: qldJurisdictionId,
          client_reference: clientReference || null,
          licence_number: licenceNumber || null,
          fishery_symbols: fisherySymbols || null,
        },
        { onConflict: "organisation_id,jurisdiction_id" },
      );

    if (profileError) {
      return { error: userFacingError(profileError) };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
  revalidatePath("/");
  revalidatePath("/marketplace", "layout");
  revalidatePath("/fisheries", "layout");
  revalidatePath("/auctions", "layout");
  return { message: "Business details saved." };
}

export async function updateOrganisationNotificationRolesAction(
  _prev: OrganisationFormState,
  formData: FormData,
): Promise<OrganisationFormState> {
  const supabase = await createClient();
  const organisationId = Number(formData.get("organisation_id"));
  const roles = notificationRolesFromForm(formData);

  if (!supabase || !Number.isInteger(organisationId)) {
    return { error: "Organisation not found." };
  }

  const mismatch = await requireActiveOrganisationMatch(organisationId);

  if (mismatch) {
    return { error: mismatch };
  }

  if (roles.length === 0) {
    return { error: "Choose at least one role." };
  }

  const actorRole = await getMyRole(organisationId);

  if (!actorRole || !canEditOrganisation(actorRole)) {
    return { error: "You do not have permission to change notification settings." };
  }

  const { error } = await supabase
    .from("organisations")
    .update({ notification_roles: roles })
    .eq("id", organisationId);

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard/account");
  return { message: "Notification settings saved." };
}

export async function updateOrganisationNotificationPreferencesAction(
  _prev: OrganisationFormState,
  formData: FormData,
): Promise<OrganisationFormState> {
  const supabase = await createClient();
  const organisationId = Number(formData.get("organisation_id"));

  if (!supabase || !Number.isInteger(organisationId)) {
    return { error: "Organisation not found." };
  }

  const mismatch = await requireActiveOrganisationMatch(organisationId);

  if (mismatch) {
    return { error: mismatch };
  }

  const actorRole = await getMyRole(organisationId);

  if (!actorRole || !canEditOrganisation(actorRole)) {
    return { error: "You do not have permission to change notification settings." };
  }

  const { error } = await supabase
    .from("organisations")
    .update({
      disabled_notification_emails: disabledProductEmails(
        formData.getAll("email_enabled").map((value) => String(value)),
        ACCOUNT_NOTIFICATION_EMAIL_IDS,
      ),
      disabled_notification_in_app: disabledProductEmails(
        formData.getAll("in_app_enabled").map((value) => String(value)),
        ACCOUNT_NOTIFICATION_EMAIL_IDS,
      ),
    })
    .eq("id", organisationId);

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard/account");
  return { message: "Notification settings saved." };
}

export async function inviteMemberAction(
  _prev: OrganisationFormState,
  formData: FormData,
): Promise<OrganisationFormState> {
  const user = await getUser();
  const supabase = await createClient();
  const organisationId = Number(formData.get("organisation_id"));
  const email = readText(formData, "email").toLowerCase();
  const memberRole = readText(formData, "role");

  if (!user?.email || !supabase || !Number.isInteger(organisationId)) {
    return { error: "Organisation not found." };
  }

  const mismatch = await requireActiveOrganisationMatch(organisationId);

  if (mismatch) {
    return { error: mismatch };
  }

  if (!email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  if (email === user.email.toLowerCase()) {
    return { error: "You cannot invite yourself." };
  }

  if (!isOrganisationRole(memberRole)) {
    return { error: "Choose a valid role." };
  }

  const actorRole = await getMyRole(organisationId);

  if (!actorRole || !canAddMember(actorRole)) {
    return { error: "You do not have permission to invite members." };
  }

  if (!canAssignRole(actorRole, memberRole)) {
    return { error: "You cannot assign that role." };
  }

  const { data: token, error } = await supabase.rpc(
    "invite_organisation_member",
    {
      p_organisation_id: organisationId,
      p_email: email,
      p_role: memberRole,
    },
  );

  if (error || typeof token !== "string" || !isInvitationToken(token)) {
    return { error: userFacingError(error ?? "Could not send that invitation.") };
  }

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");

  const siteUrl = await getSiteUrl();
  const accountName =
    (await getOrganisationLegalName(organisationId)) ?? "an FQX account";
  const acceptPath = invitationPath(token);
  const mail = await notifyEmail(
    "member_added",
    email,
    emailCopy.member_added({
      accountName,
      role: organisationRoleLabel(memberRole),
      acceptUrl: siteUrl ? `${siteUrl}${acceptPath}` : acceptPath,
      registerUrl: siteUrl
        ? `${siteUrl}/register?next=${encodeURIComponent(acceptPath)}`
        : `/register?next=${encodeURIComponent(acceptPath)}`,
    }),
  );

  if (mail.sent) {
    return { message: "Invitation sent." };
  }

  if ("skipped" in mail && mail.skipped) {
    return { message: "Invitation created." };
  }

  return {
    message: "Invitation created. The email could not be sent.",
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

export async function cancelInvitationAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const supabase = await createClient();
  const organisationId = readPositiveInt(formData, "organisation_id");
  const invitationId = readPositiveInt(formData, "invitation_id");
  const invitedRole = String(formData.get("invited_role") ?? "");

  if (
    !supabase ||
    organisationId == null ||
    invitationId == null ||
    !isOrganisationRole(invitedRole)
  ) {
    return { error: "Could not cancel that invitation." };
  }

  const mismatch = await requireActiveOrganisationMatch(organisationId);

  if (mismatch) {
    return { error: mismatch };
  }

  const actorRole = await getMyRole(organisationId);

  if (!actorRole || !canCancelInvitation(actorRole, invitedRole)) {
    return { error: "You cannot cancel that invitation." };
  }

  const { error } = await supabase.rpc("cancel_organisation_invitation", {
    p_id: invitationId,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { message: "Invitation cancelled." };
}

export async function acceptInvitationAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const supabase = await createClient();
  const token = readText(formData, "token");

  if (!supabase || !isInvitationToken(token)) {
    return { error: "Invitation not found." };
  }

  const { data, error } = await supabase.rpc("accept_organisation_invitation", {
    p_token: token,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  const organisationId = Number(data);

  if (Number.isInteger(organisationId) && organisationId > 0) {
    await setActiveOrganisationCookie(organisationId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/account");
  revalidatePath("/select-account");
  redirect("/dashboard");
}

export async function declineInvitationAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const supabase = await createClient();
  const token = readText(formData, "token");

  if (!supabase || !isInvitationToken(token)) {
    return { error: "Invitation not found." };
  }

  const { error } = await supabase.rpc("decline_organisation_invitation", {
    p_token: token,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/account");
  return { message: "Invitation declined." };
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

  revalidatePath("/dashboard/account");
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

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");

  if (isSelf) {
    return { left: true, message: "You left the business." };
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
