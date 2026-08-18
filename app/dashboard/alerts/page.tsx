import { ListingAlertsForm } from "@/components/listing-alerts-form";
import { listMyListingAlerts } from "@/lib/alerts/queries";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import { requireDashboardUser } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Alerts",
};

export default async function DashboardAlertsPage() {
  await requireDashboardUser("/dashboard/alerts");
  const [fisheries, jurisdictions, alerts] = await Promise.all([
    listFisheries(),
    listJurisdictions(),
    listMyListingAlerts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Alerts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Choose which fisheries to watch. A published sale or lease listing
          (including auctions) emails you when that switch is on.
        </p>
      </div>
      <ListingAlertsForm
        fisheries={fisheries}
        jurisdictions={jurisdictions}
        alerts={alerts}
      />
    </div>
  );
}
