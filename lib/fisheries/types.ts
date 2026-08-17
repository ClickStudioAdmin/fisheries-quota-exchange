export const MEASUREMENT_KINDS = ["WEIGHT", "UNITS", "EFFORT", "OTHER"] as const;

export type MeasurementKind = (typeof MEASUREMENT_KINDS)[number];

export type Jurisdiction = {
  id: number;
  code: string;
  name: string;
};

export const QUANTITY_TYPES = ["KG", "UNITS"] as const;

export type QuantityType = (typeof QUANTITY_TYPES)[number];

export function isQuantityType(value: string): value is QuantityType {
  return QUANTITY_TYPES.includes(value as QuantityType);
}

export function quantityTypeLabel(type: QuantityType) {
  return type === "KG" ? "kg" : "units";
}

export type Fishery = {
  id: number;
  jurisdiction_id: number;
  name: string;
  code: string | null;
  quantity_type: QuantityType;
  logo_path: string | null;
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

export const HOLDING_VERIFICATION_STATUSES = [
  "PENDING_VERIFICATION",
  "VERIFIED",
] as const;

export type HoldingVerificationStatus =
  (typeof HOLDING_VERIFICATION_STATUSES)[number];

export type QuotaHolding = {
  id: number;
  organisation_id: number;
  fishery_id: number;
  quantity: string;
  verification_status: HoldingVerificationStatus;
};

export function isHoldingVerificationStatus(
  value: string,
): value is HoldingVerificationStatus {
  return HOLDING_VERIFICATION_STATUSES.includes(
    value as HoldingVerificationStatus,
  );
}

export function holdingIsVerified(holding: QuotaHolding) {
  return holding.verification_status === "VERIFIED";
}

export function holdingVerificationLabel(status: HoldingVerificationStatus) {
  return status === "VERIFIED" ? "Verified" : "Pending verification";
}

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
