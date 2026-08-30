import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { HoldingRecord } from "@/components/holding-record";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getHolding } from "@/lib/fisheries/queries";

type AdminHoldingPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminHoldingPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Holding ${id}` };
}

export default async function AdminHoldingPage({
  params,
}: AdminHoldingPageProps) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const { id: raw } = await params;
  const holdingId = Number(raw);

  if (!Number.isInteger(holdingId) || holdingId <= 0) {
    notFound();
  }

  const holding = await getHolding(holdingId);

  if (!holding) {
    notFound();
  }

  return (
    <HoldingRecord
      holding={holding}
      backHref="/admin/holdings"
      backLabel="Holdings"
      variant="admin"
    />
  );
}
