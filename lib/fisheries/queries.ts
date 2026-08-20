import { createClient } from "@/lib/supabase/server";
import type {
  Fishery,
  Jurisdiction,
  QuotaHolding,
  QuotaLedgerEntry,
} from "@/lib/fisheries/types";
import { isHoldingVerificationStatus } from "@/lib/fisheries/types";
import { parseComplianceChecklist } from "@/lib/orders/checklist";

const HOLDING_COLUMNS =
  "id, organisation_id, fishery_id, quantity, verification_status, verification_checklist";

function mapHolding(row: Record<string, unknown> | null): QuotaHolding | null {
  if (!row) {
    return null;
  }

  const status = String(row.verification_status ?? "");
  if (!isHoldingVerificationStatus(status)) {
    return null;
  }

  return {
    id: Number(row.id),
    organisation_id: Number(row.organisation_id),
    fishery_id: Number(row.fishery_id),
    quantity: String(row.quantity),
    verification_status: status,
    verification_checklist: parseComplianceChecklist(
      row.verification_checklist,
    ),
  };
}

function mapHoldings(data: unknown): QuotaHolding[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((row) =>
      row && typeof row === "object"
        ? mapHolding(row as Record<string, unknown>)
        : null,
    )
    .filter((row): row is QuotaHolding => row != null);
}

export async function listJurisdictions() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("jurisdictions")
    .select("id, code, name")
    .order("code");
  return (data ?? []) as Jurisdiction[];
}

export async function getQldJurisdictionId() {
  const jurisdictions = await listJurisdictions();
  return jurisdictions.find((item) => item.code === "QLD")?.id ?? null;
}

export async function getHoldingJurisdictionCode(holdingId: number) {
  const holding = await getHolding(holdingId);
  if (!holding) return null;
  const fishery = await getFishery(holding.fishery_id);
  if (!fishery) return null;
  const jurisdictions = await listJurisdictions();
  return (
    jurisdictions.find((item) => item.id === fishery.jurisdiction_id)?.code ??
    null
  );
}

export async function listFisheries() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("fisheries")
    .select("id, jurisdiction_id, name, code, quantity_type, logo_path")
    .order("name");
  return (data ?? []) as Fishery[];
}

export async function getFishery(id: number) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("fisheries")
    .select("id, jurisdiction_id, name, code, quantity_type, logo_path")
    .eq("id", id)
    .maybeSingle();
  return (data as Fishery | null) ?? null;
}

export async function listHoldingsForOrganisation(organisationId: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("quota_holdings")
    .select(
      HOLDING_COLUMNS,
    )
    .eq("organisation_id", organisationId)
    .order("id");
  return mapHoldings(data);
}

export async function listHoldingsForOrganisations(organisationIds: number[]) {
  const supabase = await createClient();
  if (!supabase || organisationIds.length === 0) return [];
  const { data } = await supabase
    .from("quota_holdings")
    .select(
      HOLDING_COLUMNS,
    )
    .in("organisation_id", organisationIds)
    .order("id", { ascending: false });
  return mapHoldings(data);
}

export async function getHolding(id: number) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("quota_holdings")
    .select(
      HOLDING_COLUMNS,
    )
    .eq("id", id)
    .maybeSingle();
  return mapHolding((data as Record<string, unknown> | null) ?? null);
}

export async function listHoldingCommitments(holdingIds: number[]) {
  const committed = new Map<number, number>();

  for (const id of holdingIds) {
    committed.set(id, 0);
  }

  const supabase = await createClient();

  if (!supabase || holdingIds.length === 0) {
    return committed;
  }

  const [{ data: listings }, { data: reservations }] = await Promise.all([
    supabase
      .from("listings")
      .select("holding_id, quantity")
      .in("holding_id", holdingIds)
      .in("status", ["PENDING_APPROVAL", "PUBLISHED"]),
    supabase
      .from("quota_reservations")
      .select("holding_id, quantity")
      .in("holding_id", holdingIds)
      .eq("status", "ACTIVE"),
  ]);

  for (const row of listings ?? []) {
    committed.set(
      row.holding_id,
      (committed.get(row.holding_id) ?? 0) + Number(row.quantity),
    );
  }

  for (const row of reservations ?? []) {
    committed.set(
      row.holding_id,
      (committed.get(row.holding_id) ?? 0) + Number(row.quantity),
    );
  }

  return committed;
}

export async function listLedger(holdingId: number) {
  const ledgers = await listLedgersForHoldings([holdingId]);
  return ledgers.get(holdingId) ?? [];
}

export async function listLedgersForHoldings(holdingIds: number[]) {
  const byHolding = new Map<number, QuotaLedgerEntry[]>();

  for (const id of holdingIds) {
    byHolding.set(id, []);
  }

  const supabase = await createClient();

  if (!supabase || holdingIds.length === 0) {
    return byHolding;
  }

  const { data } = await supabase
    .from("quota_ledger")
    .select(
      "id, holding_id, event_type, quantity_delta, quantity_after, note, created_at, created_by_email",
    )
    .in("holding_id", holdingIds)
    .order("id");

  for (const entry of (data ?? []) as QuotaLedgerEntry[]) {
    const rows = byHolding.get(entry.holding_id);

    if (rows) {
      rows.push(entry);
    } else {
      byHolding.set(entry.holding_id, [entry]);
    }
  }

  return byHolding;
}

export async function listAllHoldings() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("quota_holdings")
    .select(
      HOLDING_COLUMNS,
    )
    .order("id", { ascending: false });
  return mapHoldings(data);
}
