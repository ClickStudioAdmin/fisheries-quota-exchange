import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HoldingRecord } from "@/components/holding-record";
import { SwitchAccountNotice } from "@/components/switch-account-notice";
import { getHolding } from "@/lib/fisheries/queries";
import { getActiveOrganisation } from "@/lib/organisations/active-session";
import { getMyRole, getOrganisationLegalName } from "@/lib/organisations/queries";

type DashboardHoldingPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: DashboardHoldingPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Holding ${id}` };
}

export default async function DashboardHoldingPage({
  params,
}: DashboardHoldingPageProps) {
  const { id: raw } = await params;
  const holdingId = Number(raw);

  if (!Number.isInteger(holdingId) || holdingId <= 0) {
    notFound();
  }

  const holding = await getHolding(holdingId);

  if (!holding) {
    notFound();
  }

  const role = await getMyRole(holding.organisation_id);

  if (!role) {
    notFound();
  }

  const active = await getActiveOrganisation();

  if (!active || active.id !== holding.organisation_id) {
    const name =
      (await getOrganisationLegalName(holding.organisation_id)) ??
      "that business";
    return (
      <SwitchAccountNotice
        organisationId={holding.organisation_id}
        organisationName={name}
        next={`/dashboard/holdings/${holding.id}`}
      />
    );
  }

  return (
    <HoldingRecord
      holding={holding}
      backHref="/dashboard/holdings"
      backLabel="Quota Holdings"
      variant="account"
    />
  );
}
