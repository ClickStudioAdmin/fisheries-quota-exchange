"use server";

import { redirect } from "next/navigation";
import {
  afterAccountSelectionPath,
  selectAccountPath,
} from "@/lib/organisations/active-account";
import { setActiveOrganisationCookie } from "@/lib/organisations/active-session";
import { listMyOrganisations } from "@/lib/organisations/queries";

export async function selectAccountAction(formData: FormData) {
  const organisationId = Number(formData.get("organisation_id"));
  const next = afterAccountSelectionPath(String(formData.get("next") ?? ""));
  const organisations = await listMyOrganisations();

  if (!organisations.some((organisation) => organisation.id === organisationId)) {
    redirect(selectAccountPath(next));
  }

  await setActiveOrganisationCookie(organisationId);
  redirect(next);
}
