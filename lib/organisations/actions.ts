"use server";

import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  canAddMember,
  canAssignRole,
  canChangeMemberRole,
  canEditOrganisation,
  canRemoveMember,
} from "@/lib/organisations/permissions";
import { getMyRole } from "@/lib/organisations/queries";
import { accountPath } from "@/lib/organisations/paths";
import { isOrganisationRole } from "@/lib/organisations/types";

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
    return { error: error.message };
  }

  redirect(accountPath(Number(data)));
}

export async function updateOrganisationAction(
  _prev: OrganisationFormState,
  formData: FormData,
): Promise<OrganisationFormState> {
  const supabase = await createClient();
  const organisationId = Number(formData.get("organisation_id"));

  if (!supabase || !Number.isInteger(organisationId)) {
    return { error: "Organisation not found." };
  }

  const role = await getMyRole(organisationId);

  if (!role || !canEditOrganisation(role)) {
    return { error: "You do not have permission to update this organisation." };
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

  const { error } = await supabase
    .from("organisations")
    .update({
      legal_name: legalName,
      trading_name: tradingName || null,
      abn: abnResult.abn,
    })
    .eq("id", organisationId);

  if (error) {
    return { error: error.message };
  }

  return { message: "Account updated." };
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
    if (error.code === "23505") {
      return { error: "That email is already a member." };
    }

    return { error: error.message };
  }

  return { message: "Member added." };
}

export async function updateMemberRoleAction(formData: FormData) {
  const supabase = await createClient();
  const organisationId = Number(formData.get("organisation_id"));
  const memberId = Number(formData.get("member_id"));
  const memberRole = String(formData.get("role") ?? "");

  if (!supabase || !Number.isInteger(organisationId) || !Number.isInteger(memberId)) {
    return;
  }

  if (!isOrganisationRole(memberRole)) {
    return;
  }

  const actorRole = await getMyRole(organisationId);

  if (!actorRole || !canChangeMemberRole(actorRole)) {
    return;
  }

  await supabase
    .from("organisation_users")
    .update({ role: memberRole })
    .eq("id", memberId)
    .eq("organisation_id", organisationId);

  redirect(accountPath(organisationId, "/dashboard/members"));
}

export async function removeMemberAction(formData: FormData) {
  const user = await getUser();
  const supabase = await createClient();
  const organisationId = Number(formData.get("organisation_id"));
  const memberId = Number(formData.get("member_id"));
  const targetRole = String(formData.get("target_role") ?? "");
  const targetEmail = String(formData.get("target_email") ?? "").toLowerCase();

  if (
    !user?.email ||
    !supabase ||
    !Number.isInteger(organisationId) ||
    !Number.isInteger(memberId) ||
    !isOrganisationRole(targetRole)
  ) {
    return;
  }

  const actorRole = await getMyRole(organisationId);
  const isSelf = targetEmail === user.email.toLowerCase();

  if (!actorRole || !canRemoveMember(actorRole, targetRole, isSelf)) {
    return;
  }

  const { error } = await supabase
    .from("organisation_users")
    .delete()
    .eq("id", memberId)
    .eq("organisation_id", organisationId);

  if (error) {
    return;
  }

  if (isSelf) {
    redirect("/dashboard");
  }

  redirect(accountPath(organisationId, "/dashboard/members"));
}
