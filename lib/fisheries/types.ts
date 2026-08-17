export const MEASUREMENT_KINDS = ["WEIGHT", "UNITS", "EFFORT", "OTHER"] as const;

export type MeasurementKind = (typeof MEASUREMENT_KINDS)[number];

export type Jurisdiction = {
  id: number;
  code: string;
  name: string;
};

export type Fishery = {
  id: number;
  jurisdiction_id: number;
  name: string;
  code: string | null;
};

export type Stock = {
  id: number;
  fishery_id: number;
  name: string;
};

export type Season = {
  id: number;
  fishery_id: number;
  name: string;
  starts_on: string;
  ends_on: string;
};

export type QuotaType = {
  id: number;
  fishery_id: number;
  measurement_kind: MeasurementKind;
  name: string;
  unit_label: string;
};

export type FisheryRule = {
  id: number;
  fishery_id: number;
  code: string;
  value: unknown;
};

export type QuotaHolding = {
  id: number;
  organisation_id: number;
  stock_id: number;
  season_id: number;
  quota_type_id: number;
  quantity: string;
};

export type QuotaLedgerEntry = {
  id: number;
  holding_id: number;
  event_type: string;
  quantity_delta: string;
  quantity_after: string;
  note: string | null;
  created_at: string;
  created_by_email: string | null;
};
