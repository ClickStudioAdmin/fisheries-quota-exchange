"use client";

import { useId, useMemo, useState } from "react";
import { useActionState } from "react";
import { buttonClassName } from "@/components/auth-card";
import {
  tableBodyCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
  tableWrapClassName,
} from "@/components/data-table";
import { SettingsSwitch } from "@/components/settings-switch";
import {
  updateListingAlertsAction,
  type PreferenceFormState,
} from "@/lib/alerts/actions";
import type { ListingAlert } from "@/lib/alerts/types";
import {
  fisherySelectLabel,
  jurisdictionLabel,
  type Fishery,
  type Jurisdiction,
} from "@/lib/fisheries/types";

const initialState: PreferenceFormState = {};

const filterFieldClassName =
  "border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-sea";

function idsWith(alerts: ListingAlert[], kind: "sales" | "leases") {
  return new Set(
    alerts.filter((alert) => alert[kind]).map((alert) => alert.fishery_id),
  );
}

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
  const [sales, setSales] = useState(() => idsWith(alerts, "sales"));
  const [leases, setLeases] = useState(() => idsWith(alerts, "leases"));
  const [query, setQuery] = useState("");
  const [jurisdictionId, setJurisdictionId] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const searchId = useId();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return fisheries.filter((fishery) => {
      if (jurisdictionId && String(fishery.jurisdiction_id) !== jurisdictionId) {
        return false;
      }

      const on = sales.has(fishery.id) || leases.has(fishery.id);
      if (activeOnly && !on) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const label = fisherySelectLabel(fishery, jurisdictions).toLowerCase();
      const jurisdiction = jurisdictions.find(
        (item) => item.id === fishery.jurisdiction_id,
      );
      const haystack = [
        fishery.name,
        fishery.code ?? "",
        label,
        jurisdiction?.name ?? "",
        jurisdiction?.code ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [
    activeOnly,
    fisheries,
    jurisdictionId,
    jurisdictions,
    leases,
    query,
    sales,
  ]);

  function toggle(kind: "sales" | "leases", fisheryId: number, on: boolean) {
    const setKind = kind === "sales" ? setSales : setLeases;
    setKind((current) => {
      const next = new Set(current);
      if (on) {
        next.add(fisheryId);
      } else {
        next.delete(fisheryId);
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {Array.from(sales, (id) => (
        <input key={`sale-${id}`} type="hidden" name="sale" value={id} />
      ))}
      {Array.from(leases, (id) => (
        <input key={`lease-${id}`} type="hidden" name="lease" value={id} />
      ))}
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
        matching listing or auction is published. These watches stay with you
        when you switch business.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="sr-only" htmlFor={searchId}>
          Search fisheries
        </label>
        <input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search fisheries…"
          className={`${filterFieldClassName} w-full sm:max-w-xs`}
        />
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="whitespace-nowrap">Jurisdiction</span>
          <select
            value={jurisdictionId}
            onChange={(event) => setJurisdictionId(event.target.value)}
            className={filterFieldClassName}
          >
            <option value="">All</option>
            {jurisdictions.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {jurisdictionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <SettingsSwitch
            checked={activeOnly}
            onCheckedChange={setActiveOnly}
            label="Show only active alerts"
          />
          <span>Active alerts</span>
        </label>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {fisheries.length === 0
            ? "No fisheries are listed yet."
            : "No fisheries match these filters."}
        </p>
      ) : (
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
              {visible.map((fishery, index) => (
                <tr key={fishery.id} className={tableRowClassName(index)}>
                  <td className={tableBodyCellClassName}>
                    {fisherySelectLabel(fishery, jurisdictions)}
                  </td>
                  <td className={tableBodyCellClassName}>
                    <SettingsSwitch
                      checked={sales.has(fishery.id)}
                      onCheckedChange={(on) => toggle("sales", fishery.id, on)}
                      label={`Sale alerts for ${fishery.name}`}
                    />
                  </td>
                  <td className={tableBodyCellClassName}>
                    <SettingsSwitch
                      checked={leases.has(fishery.id)}
                      onCheckedChange={(on) => toggle("leases", fishery.id, on)}
                      label={`Lease alerts for ${fishery.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save alerts"}
      </button>
    </form>
  );
}
