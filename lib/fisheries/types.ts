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

export function jurisdictionLabel(
  jurisdiction: Pick<Jurisdiction, "name"> | null | undefined,
) {
  const name = jurisdiction?.name?.trim();
  return name ? name : "Jurisdiction";
}

export function fisheryNameWithJurisdiction(
  name: string,
  code: string | null | undefined,
) {
  const trimmed = code?.trim();
  return trimmed ? `${trimmed} - ${name}` : name;
}

export function fisherySelectLabel(
  fishery: Pick<Fishery, "name" | "jurisdiction_id">,
  jurisdictions: readonly Pick<Jurisdiction, "id" | "code">[],
) {
  const code = jurisdictions.find(
    (item) => item.id === fishery.jurisdiction_id,
  )?.code;

  return fisheryNameWithJurisdiction(fishery.name, code);
}

export function fisherySelectLabelForName(
  name: string,
  fisheries: readonly Fishery[],
  jurisdictions: readonly Pick<Jurisdiction, "id" | "code">[],
) {
  const fishery = fisheries.find((item) => item.name === name);
  return fishery ? fisherySelectLabel(fishery, jurisdictions) : name;
}

export type Fishery = {
  id: number;
  jurisdiction_id: number;
  name: string;
  code: string | null;
  quantity_type: QuantityType;
  logo_path: string | null;
  sale_allowed: boolean;
  lease_allowed: boolean;
};

export function fisheryAllowsOffering(
  fishery: Pick<Fishery, "sale_allowed" | "lease_allowed">,
  offering: "SALE" | "LEASE",
) {
  return offering === "LEASE" ? fishery.lease_allowed : fishery.sale_allowed;
}

export function fisheryOfferingOptions(
  fishery: Pick<Fishery, "sale_allowed" | "lease_allowed">,
): Array<"SALE" | "LEASE"> {
  const options: Array<"SALE" | "LEASE"> = [];
  if (fishery.sale_allowed) {
    options.push("SALE");
  }
  if (fishery.lease_allowed) {
    options.push("LEASE");
  }
  return options;
}

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
  "CANCELLED",
] as const;

export type HoldingVerificationStatus =
  (typeof HOLDING_VERIFICATION_STATUSES)[number];

export const HOLDING_CUSTODY_KINDS = ["MEMBER", "FQX_CUSTODIAL"] as const;

export type HoldingCustodyKind = (typeof HOLDING_CUSTODY_KINDS)[number];

export type QuotaHolding = {
  id: number;
  organisation_id: number;
  fishery_id: number;
  quantity: string;
  custody_kind: HoldingCustodyKind;
  verification_status: HoldingVerificationStatus;
  verification_checklist: string[];
};

export function isHoldingVerificationStatus(
  value: string,
): value is HoldingVerificationStatus {
  return HOLDING_VERIFICATION_STATUSES.includes(
    value as HoldingVerificationStatus,
  );
}

export function isHoldingCustodyKind(value: string): value is HoldingCustodyKind {
  return HOLDING_CUSTODY_KINDS.includes(value as HoldingCustodyKind);
}

export function holdingIsVerified(holding: QuotaHolding) {
  return holding.verification_status === "VERIFIED";
}

export function holdingIsCancelled(
  holding: Pick<QuotaHolding, "verification_status">,
) {
  return holding.verification_status === "CANCELLED";
}

export function holdingIsCustodial(holding: Pick<QuotaHolding, "custody_kind">) {
  return holding.custody_kind === "FQX_CUSTODIAL";
}

export function holdingMarketplaceOfferings(
  holding: Pick<QuotaHolding, "custody_kind">,
  fishery: Pick<Fishery, "sale_allowed" | "lease_allowed">,
  jurisdictionCode: string | null | undefined,
): Array<"SALE" | "LEASE"> {
  if (holdingIsCustodial(holding)) {
    if (jurisdictionCode !== "QLD" || !fishery.lease_allowed) {
      return [];
    }

    return ["LEASE"];
  }

  const options = fisheryOfferingOptions(fishery);

  if (jurisdictionCode === "QLD") {
    return options.filter((offering) => offering === "SALE");
  }

  return options;
}

export function holdingOfferingBlockedMessage(
  holding: Pick<QuotaHolding, "custody_kind">,
  jurisdictionCode: string | null | undefined,
): string | null {
  if (holdingIsCustodial(holding) && jurisdictionCode !== "QLD") {
    return "Custodial holdings are only supported for Queensland.";
  }

  if (
    holdingIsCustodial(holding) &&
    jurisdictionCode === "QLD"
  ) {
    return "Custodial quota can only be listed for lease.";
  }

  if (jurisdictionCode === "QLD" && !holdingIsCustodial(holding)) {
    return "Queensland leases require FQX custodial quota. Request custodial quota from Holdings first.";
  }

  return null;
}

export function holdingVerificationLabel(status: HoldingVerificationStatus) {
  if (status === "VERIFIED") return "Verified";
  if (status === "CANCELLED") return "Cancelled";
  return "Pending verification";
}

export function holdingCustodyLabel(kind: HoldingCustodyKind) {
  return kind === "FQX_CUSTODIAL" ? "FQX custodial" : "Member held";
}

export function parseHoldingIds(value?: string | null) {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(/[,\s]+/)
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
}

export function holdingVerifyPath(ids: Array<string | number>) {
  const unique = parseHoldingIds(ids.join(","));

  if (unique.length === 0) {
    return "/admin/holdings";
  }

  return `/admin/holdings?queue=${unique.join(",")}`;
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

export const CUSTODY_RELEASE_STATUSES = [
  "PENDING",
  "COMPLETED",
  "CANCELLED",
] as const;

export type CustodyReleaseStatus = (typeof CUSTODY_RELEASE_STATUSES)[number];

export type CustodyReleaseRequest = {
  id: number;
  organisation_id: number;
  holding_id: number;
  quantity: string;
  status: CustodyReleaseStatus;
  fishnet_reference: string | null;
  admin_notes: string | null;
  created_by_email: string | null;
  completed_by_email: string | null;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
};

export function isCustodyReleaseStatus(
  value: string,
): value is CustodyReleaseStatus {
  return CUSTODY_RELEASE_STATUSES.includes(value as CustodyReleaseStatus);
}

export function custodyReleaseStatusLabel(status: CustodyReleaseStatus) {
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  return "Pending";
}
