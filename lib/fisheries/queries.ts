import { createClient } from "@/lib/supabase/server";
import type {
  Fishery,
  Jurisdiction,
  QuotaHolding,
  QuotaLedgerEntry,
  CustodyReleaseRequest,
} from "@/lib/fisheries/types";
import {
  isHoldingVerificationStatus,
  isHoldingCustodyKind,
  isCustodyReleaseStatus,
} from "@/lib/fisheries/types";
import { parseComplianceChecklist } from "@/lib/orders/checklist";

const HOLDING_COLUMNS =
  "id, organisation_id, fishery_id, quantity, custody_kind, verification_status, verification_checklist";

function mapHolding(row: Record<string, unknown> | null): QuotaHolding | null {
  if (!row) {
    return null;
  }

  const status = String(row.verification_status ?? "");
  const custody = String(row.custody_kind ?? "MEMBER");
  if (!isHoldingVerificationStatus(status)) {
    return null;
  }
  if (!isHoldingCustodyKind(custody)) {
    return null;
  }

  return {
    id: Number(row.id),
    organisation_id: Number(row.organisation_id),
    fishery_id: Number(row.fishery_id),
    quantity: String(row.quantity),
    custody_kind: custody,
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
    .select(
      "id, jurisdiction_id, name, code, quantity_type, logo_path, sale_allowed, lease_allowed",
    )
    .order("name");
  return (data ?? []) as Fishery[];
}

export async function getFishery(id: number) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("fisheries")
    .select(
      "id, jurisdiction_id, name, code, quantity_type, logo_path, sale_allowed, lease_allowed",
    )
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

const CUSTODY_RELEASE_COLUMNS =
  "id, organisation_id, holding_id, quantity, status, fishnet_reference, admin_notes, created_by_email, completed_by_email, created_at, completed_at, cancelled_at";

function mapCustodyRelease(
  row: Record<string, unknown> | null,
): CustodyReleaseRequest | null {
  if (!row) {
    return null;
  }

  const status = String(row.status ?? "");
  if (!isCustodyReleaseStatus(status)) {
    return null;
  }

  return {
    id: Number(row.id),
    organisation_id: Number(row.organisation_id),
    holding_id: Number(row.holding_id),
    quantity: String(row.quantity),
    status,
    fishnet_reference: (row.fishnet_reference as string | null) ?? null,
    admin_notes: (row.admin_notes as string | null) ?? null,
    created_by_email: (row.created_by_email as string | null) ?? null,
    completed_by_email: (row.completed_by_email as string | null) ?? null,
    created_at: String(row.created_at),
    completed_at: (row.completed_at as string | null) ?? null,
    cancelled_at: (row.cancelled_at as string | null) ?? null,
  };
}

function mapCustodyReleases(data: unknown): CustodyReleaseRequest[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((row) =>
      row && typeof row === "object"
        ? mapCustodyRelease(row as Record<string, unknown>)
        : null,
    )
    .filter((row): row is CustodyReleaseRequest => row != null);
}

export async function listCustodyReleaseRequestsForHolding(holdingId: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("custody_release_requests")
    .select(CUSTODY_RELEASE_COLUMNS)
    .eq("holding_id", holdingId)
    .order("id", { ascending: false });
  return mapCustodyReleases(data);
}

export async function listPendingCustodyReleaseRequestsForOrganisation(
  organisationId: number,
) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("custody_release_requests")
    .select(CUSTODY_RELEASE_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("status", "PENDING")
    .order("id", { ascending: false });
  return mapCustodyReleases(data);
}

export async function listAllPendingCustodyReleaseRequests() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("custody_release_requests")
    .select(CUSTODY_RELEASE_COLUMNS)
    .eq("status", "PENDING")
    .order("id", { ascending: false });
  return mapCustodyReleases(data);
}

export async function getCustodyReleaseRequest(id: number) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("custody_release_requests")
    .select(CUSTODY_RELEASE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return mapCustodyRelease((data as Record<string, unknown> | null) ?? null);
}
