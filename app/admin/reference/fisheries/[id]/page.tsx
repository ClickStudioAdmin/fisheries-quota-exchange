import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FisheryAdminForm } from "@/components/fishery-admin-form";
import { FisheryLogo } from "@/components/fishery-logo";
import { FisheryLogoForm } from "@/components/fishery-logo-form";
import { isPlatformAdmin } from "@/lib/admin/access";
import { updateFisheryAction } from "@/lib/fisheries/actions";
import { getFishery, listJurisdictions } from "@/lib/fisheries/queries";
import { jurisdictionLabel } from "@/lib/fisheries/types";

export const metadata = {
  title: "Fishery",
};

export default async function FisheryAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const { id } = await params;
  const fisheryId = Number(id);

  if (!Number.isInteger(fisheryId)) {
    notFound();
  }

  const fishery = await getFishery(fisheryId);

  if (!fishery) {
    notFound();
  }

  const jurisdictions = await listJurisdictions();
  const jurisdiction = jurisdictions.find(
    (item) => item.id === fishery.jurisdiction_id,
  );

  return (
    <div className="space-y-12">
      <div>
        <p className="text-sm text-ink-muted">
          <Link href="/admin/reference/fisheries" className="underline">
            Fisheries
          </Link>
        </p>
        <div className="mt-2 flex items-start gap-4">
          <FisheryLogo fishery={fishery} size="lg" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {fishery.name}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {jurisdiction
                ? jurisdictionLabel(jurisdiction)
                : "Jurisdiction not found."}
            </p>
          </div>
        </div>
      </div>
      <section className="max-w-md space-y-4">
        <FisheryAdminForm
          action={updateFisheryAction}
          submitLabel="Save fishery"
          jurisdictions={jurisdictions}
          fishery={fishery}
        />
        {fishery.logo_path ? (
          <FisheryLogoForm fisheryId={fishery.id} hasLogo hideUpload />
        ) : null}
      </section>
    </div>
  );
}
