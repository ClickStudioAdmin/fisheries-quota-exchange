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
    <ListingAlertsForm
      fisheries={fisheries}
      jurisdictions={jurisdictions}
      alerts={alerts}
    />
  );
}
