import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { SwitchAccountNotice } from "@/components/switch-account-notice";
import { getActiveOrganisation } from "@/lib/organisations/active-session";
import { getMyRole, getOrganisationLegalName } from "@/lib/organisations/queries";

export default async function OrganisationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organisationId = Number(id);

  if (!Number.isInteger(organisationId)) {
    notFound();
  }

  const role = await getMyRole(organisationId);

  if (!role) {
    notFound();
  }

  const active = await getActiveOrganisation();

  if (active?.id === organisationId) {
    redirect("/dashboard");
  }

  const name = (await getOrganisationLegalName(organisationId)) ?? "that business";

  return (
    <SwitchAccountNotice
      organisationId={organisationId}
      organisationName={name}
      next="/dashboard"
    />
  );
}
