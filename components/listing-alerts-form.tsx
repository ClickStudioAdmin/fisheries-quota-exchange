"use client";

import { useActionState } from "react";
import {
  tableBodyCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
  tableWrapClassName,
} from "@/components/data-table";
import { SettingsSwitch } from "@/components/settings-switch";
import { StickySettingsHeader } from "@/components/sticky-settings-header";
import {
  updateListingAlertsAction,
  type PreferenceFormState,
} from "@/lib/alerts/actions";
import type { ListingAlert } from "@/lib/alerts/types";
import {
  fisherySelectLabel,
  type Fishery,
  type Jurisdiction,
} from "@/lib/fisheries/types";

const initialState: PreferenceFormState = {};

export function ListingAlertsForm({
  fisheries,
  jurisdictions,
  alerts,
}: {
  fisheries: Fishery[];
  jurisdictions: Jurisdiction[];
  alerts: ListingAlert[];
}) {
  const [state, formAction, pending] = useActionState(
    updateListingAlertsAction,
    initialState,
  );
  const selected = new Map(
    alerts.map((alert) => [alert.fishery_id, alert] as const),
  );

  return (
    <form action={formAction} className="space-y-6">
      <StickySettingsHeader
        title="Alerts"
        description="Choose which fisheries to watch. A published sale or lease listing (including auctions) notifies you when that switch is on."
        pending={pending}
        saveLabel="Save alerts"
      />
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-sea" role="status">
          {state.message}
        </p>
      ) : null}
      <p className="text-sm text-ink-muted">
        Turn on sale and/or lease for each fishery. You are notified when a
        matching listing or auction is published. You can turn email or in-app
        off on Notifications without clearing these switches.
      </p>
      <div className={tableWrapClassName}>
        <table className={tableClassName}>
          <thead className={tableHeadClassName}>
            <tr>
              <th className={tableHeaderCellClassName}>Fishery</th>
              <th className={`w-24 ${tableHeaderCellClassName}`}>Sale</th>
              <th className={`w-24 ${tableHeaderCellClassName}`}>Lease</th>
            </tr>
          </thead>
          <tbody>
            {fisheries.map((fishery, index) => {
              const alert = selected.get(fishery.id);
              return (
                <tr key={fishery.id} className={tableRowClassName(index)}>
                  <td className={tableBodyCellClassName}>
                    {fisherySelectLabel(fishery, jurisdictions)}
                  </td>
                  <td className={tableBodyCellClassName}>
                    <SettingsSwitch
                      name="sale"
                      value={String(fishery.id)}
                      defaultChecked={Boolean(alert?.sales)}
                      label={`Sale alerts for ${fishery.name}`}
                    />
                  </td>
                  <td className={tableBodyCellClassName}>
                    <SettingsSwitch
                      name="lease"
                      value={String(fishery.id)}
                      defaultChecked={Boolean(alert?.leases)}
                      label={`Lease alerts for ${fishery.name}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {fisheries.length === 0 ? (
        <p className="text-sm text-ink-muted">No fisheries are listed yet.</p>
      ) : null}
    </form>
  );
}
