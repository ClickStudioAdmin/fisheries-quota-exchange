import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HoldingRecord } from "@/components/holding-record";
import { getHolding } from "@/lib/fisheries/queries";
import { accountPath } from "@/lib/organisations/paths";
import { getMyRole } from "@/lib/organisations/queries";

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

  return (
    <HoldingRecord
      holding={holding}
      backHref={accountPath(holding.organisation_id, "/dashboard/holdings")}
      backLabel="Quota holdings"
      variant="account"
    />
  );
}
