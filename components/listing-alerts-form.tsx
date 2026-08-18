"use client";

import { useActionState } from "react";
import { buttonClassName } from "@/components/auth-card";
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
    <form action={formAction} className="max-w-3xl space-y-6">
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
        Tick sale and/or lease for each fishery. You get an email when a
        matching listing or auction is published. You can turn the email off
        on Notifications without clearing these ticks.
      </p>
      <div className="overflow-x-auto border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-paper-raised text-xs uppercase tracking-[0.12em] text-ink-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Fishery</th>
              <th className="px-3 py-2 font-medium">Sale</th>
              <th className="px-3 py-2 font-medium">Lease</th>
            </tr>
          </thead>
          <tbody>
            {fisheries.map((fishery) => {
              const alert = selected.get(fishery.id);
              return (
                <tr key={fishery.id} className="border-t border-line">
                  <td className="px-3 py-2 text-ink">
                    {fisherySelectLabel(fishery, jurisdictions)}
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-ink">
                      <input
                        type="checkbox"
                        name="sale"
                        value={String(fishery.id)}
                        defaultChecked={Boolean(alert?.sales)}
                      />
                      <span className="sr-only">
                        Sale alerts for {fishery.name}
                      </span>
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-ink">
                      <input
                        type="checkbox"
                        name="lease"
                        value={String(fishery.id)}
                        defaultChecked={Boolean(alert?.leases)}
                      />
                      <span className="sr-only">
                        Lease alerts for {fishery.name}
                      </span>
                    </label>
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
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save alerts"}
      </button>
    </form>
  );
}
