import { notFound, redirect } from "next/navigation";
import { accountPath } from "@/lib/organisations/paths";

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

  redirect(accountPath(organisationId));
}
