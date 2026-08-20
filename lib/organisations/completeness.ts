import type {
  Organisation,
  OrganisationJurisdictionProfile,
} from "./types";
import type { TransferProfileField } from "../transfers/types";

export type TradeReadyField = TransferProfileField;

export const TRADE_READY_FIELD_LABELS: Record<TradeReadyField, string> = {
  entity_kind: "Entity kind",
  legal_name: "Legal name",
  abn: "ABN",
  acn: "ACN",
  date_of_birth: "Date of birth",
  mobile: "Phone",
  registered_address: "Registered address",
  postal_address: "Postal address",
  qld_client_number: "Queensland fisheries client number",
  qld_licence_number: "Primary commercial fishing licence",
};

function present(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function addressComplete(address: Organisation["registered_address"]) {
  return Boolean(
    address &&
      address.line1.trim() &&
      address.suburb.trim() &&
      address.state &&
      /^\d{4}$/.test(address.postcode),
  );
}

export function tradeRequiresQldProfile(
  jurisdictionCode: string | null | undefined,
) {
  return jurisdictionCode === "QLD";
}

export function missingBusinessDetailFields(
  organisation: Pick<
    Organisation,
    | "legal_name"
    | "entity_kind"
    | "abn"
    | "acn"
    | "date_of_birth"
    | "mobile"
    | "registered_address"
    | "postal_address"
    | "postal_same_as_registered"
  >,
): TradeReadyField[] {
  const missing: TradeReadyField[] = [];
  const company = organisation.entity_kind === "COMPANY";
  const individual = organisation.entity_kind === "INDIVIDUAL";

  if (!organisation.entity_kind) missing.push("entity_kind");
  if (!present(organisation.legal_name)) missing.push("legal_name");
  if (!present(organisation.abn)) missing.push("abn");
  if (company && !present(organisation.acn)) missing.push("acn");
  if (individual && !present(organisation.date_of_birth)) {
    missing.push("date_of_birth");
  }
  if (!present(organisation.mobile)) missing.push("mobile");
  if (!addressComplete(organisation.registered_address)) {
    missing.push("registered_address");
  }
  if (
    organisation.postal_same_as_registered === false &&
    !addressComplete(organisation.postal_address)
  ) {
    missing.push("postal_address");
  }

  return missing;
}

export function missingQldTradeFields(
  profile: Pick<
    OrganisationJurisdictionProfile,
    "client_reference" | "licence_number"
  > | null,
): TradeReadyField[] {
  const missing: TradeReadyField[] = [];

  if (!present(profile?.client_reference)) missing.push("qld_client_number");
  if (!present(profile?.licence_number)) missing.push("qld_licence_number");

  return missing;
}

export function missingTradeReadyFields(input: {
  organisation: Parameters<typeof missingBusinessDetailFields>[0] & {
    enabled_jurisdiction_codes?: readonly string[];
  };
  qldProfile?: Parameters<typeof missingQldTradeFields>[0];
  requireQldProfile?: boolean;
}): TradeReadyField[] {
  const missing = missingBusinessDetailFields(input.organisation);

  if (input.requireQldProfile) {
    const qldEnabled = (
      input.organisation.enabled_jurisdiction_codes ?? []
    ).includes("QLD");
    missing.push(
      ...missingQldTradeFields(qldEnabled ? (input.qldProfile ?? null) : null),
    );
  }

  return missing;
}

export function tradeReadyFieldLabels(fields: TradeReadyField[]) {
  return fields.map((field) => TRADE_READY_FIELD_LABELS[field]);
}

export function formatMissingTradeReadyMessage(fields: TradeReadyField[]) {
  const labels = tradeReadyFieldLabels(fields);

  if (labels.length === 0) {
    return "Complete required business details on Business Settings before you can buy or list quota.";
  }

  return `Complete required business details on Business Settings before you can buy or list quota. Missing: ${labels.join(", ")}.`;
}
