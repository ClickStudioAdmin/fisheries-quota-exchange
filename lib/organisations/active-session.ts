import "server-only";

import { cookies } from "next/headers";
import { isPlatformAdmin } from "@/lib/admin/access";
import { postLoginPath } from "@/lib/auth/paths";
import {
  ACTIVE_ORGANISATION_COOKIE,
  activeOrganisationCookieOptions,
  parseActiveOrganisationId,
  resolveActiveOrganisation,
  selectAccountPath,
} from "@/lib/organisations/active-account";
import { listMyOrganisations } from "@/lib/organisations/queries";
import type { OrganisationSummary } from "@/lib/organisations/types";

export const ACTIVE_ORGANISATION_REQUIRED_MESSAGE =
  "Choose an account before you continue.";

export const ACTIVE_ORGANISATION_MISMATCH_MESSAGE =
  "Switch account before you continue with this organisation.";

export async function readActiveOrganisationCookie() {
  const store = await cookies();
  return parseActiveOrganisationId(
    store.get(ACTIVE_ORGANISATION_COOKIE)?.value,
  );
}

export async function setActiveOrganisationCookie(organisationId: number) {
  const store = await cookies();
  store.set(
    ACTIVE_ORGANISATION_COOKIE,
    String(organisationId),
    activeOrganisationCookieOptions(),
  );
}

export async function clearActiveOrganisationCookie() {
  const store = await cookies();
  store.delete(ACTIVE_ORGANISATION_COOKIE);
}

export async function getActiveOrganisation(): Promise<OrganisationSummary | null> {
  const organisations = await listMyOrganisations();
  const cookieId = await readActiveOrganisationCookie();
  const resolved = resolveActiveOrganisation(
    organisations.map((organisation) => organisation.id),
    cookieId,
  );

  if (resolved.selectedId == null) {
    return null;
  }

  return (
    organisations.find((organisation) => organisation.id === resolved.selectedId) ??
    null
  );
}

export async function requireActiveOrganisationMatch(organisationId: number) {
  const active = await getActiveOrganisation();

  if (!active) {
    return ACTIVE_ORGANISATION_REQUIRED_MESSAGE;
  }

  if (active.id !== organisationId) {
    return ACTIVE_ORGANISATION_MISMATCH_MESSAGE;
  }

  return null;
}

export async function continueAfterAuthentication(next?: string | null) {
  const intended = postLoginPath(next, await isPlatformAdmin());
  const organisations = await listMyOrganisations();

  if (organisations.length === 0) {
    await clearActiveOrganisationCookie();
    return intended;
  }

  if (organisations.length === 1) {
    await setActiveOrganisationCookie(organisations[0].id);
    return intended;
  }

  await clearActiveOrganisationCookie();
  return selectAccountPath(intended);
}

export async function pathForSignedInUser(next?: string | null) {
  const intended = postLoginPath(next, await isPlatformAdmin());
  const organisations = await listMyOrganisations();
  const cookieId = await readActiveOrganisationCookie();
  const resolved = resolveActiveOrganisation(
    organisations.map((organisation) => organisation.id),
    cookieId,
  );

  if (resolved.needsSelection) {
    return selectAccountPath(intended);
  }

  return intended;
}
