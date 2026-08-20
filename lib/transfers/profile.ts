import type { Organisation, OrganisationJurisdictionProfile } from "../organisations/types";
import type {
  JurisdictionTransferProcess,
  TransferProfileField,
} from "./types";

export const TRANSFER_PROFILE_FIELD_LABELS: Record<TransferProfileField, string> =
  {
    entity_kind: "Entity kind",
    legal_name: "Legal name",
    abn: "ABN",
    acn: "ACN",
    mobile: "Phone",
    registered_address: "Registered address",
    postal_address: "Postal address",
    qld_client_number: "Queensland fisheries client number",
    qld_licence_number: "Primary commercial fishing licence",
  };

function present(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function addressComplete(
  address: Organisation["registered_address"],
) {
  return Boolean(
    address &&
      address.line1.trim() &&
      address.suburb.trim() &&
      address.state &&
      /^\d{4}$/.test(address.postcode),
  );
}

export function missingTransferProfileFields(input: {
  organisation: Pick<
    Organisation,
    | "legal_name"
    | "entity_kind"
    | "abn"
    | "acn"
    | "mobile"
    | "registered_address"
    | "postal_address"
    | "postal_same_as_registered"
  >;
  profile: Pick<
    OrganisationJurisdictionProfile,
    "client_reference" | "licence_number"
  > | null;
  process: Pick<JurisdictionTransferProcess, "requiredProfileFields">;
}): TransferProfileField[] {
  const missing: TransferProfileField[] = [];
  const company = input.organisation.entity_kind === "COMPANY";

  for (const field of input.process.requiredProfileFields) {
    switch (field) {
      case "entity_kind":
        if (!input.organisation.entity_kind) missing.push(field);
        break;
      case "legal_name":
        if (!present(input.organisation.legal_name)) missing.push(field);
        break;
      case "abn":
        if (company && !present(input.organisation.abn)) missing.push(field);
        break;
      case "acn":
        if (company && !present(input.organisation.acn)) missing.push(field);
        break;
      case "mobile":
        if (!present(input.organisation.mobile)) missing.push(field);
        break;
      case "registered_address":
        if (!addressComplete(input.organisation.registered_address)) {
          missing.push(field);
        }
        break;
      case "postal_address":
        if (
          !input.organisation.postal_same_as_registered &&
          !addressComplete(input.organisation.postal_address)
        ) {
          missing.push(field);
        }
        break;
      case "qld_client_number":
        if (!present(input.profile?.client_reference)) missing.push(field);
        break;
      case "qld_licence_number":
        if (!present(input.profile?.licence_number)) missing.push(field);
        break;
    }
  }

  return missing;
}

export function transferProfileFieldLabels(fields: TransferProfileField[]) {
  return fields.map((field) => TRANSFER_PROFILE_FIELD_LABELS[field]);
}
