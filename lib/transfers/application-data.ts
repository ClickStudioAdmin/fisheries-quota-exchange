import type { AustralianAddress } from "@/lib/organisations/address";

export type TransferSignatory = {
  full_name: string;
  role: string;
};

export type TransferPartyDetails = {
  id: number;
  legal_name: string;
  trading_name: string | null;
  abn: string | null;
  entity_kind: "INDIVIDUAL" | "COMPANY" | null;
  acn: string | null;
  mobile: string | null;
  registered_address: AustralianAddress | null;
  postal_address: AustralianAddress | null;
  postal_same_as_registered: boolean;
  profile: {
    organisation_id: number;
    jurisdiction_id: number;
    client_reference: string | null;
    licence_number: string | null;
    fishery_symbols: string | null;
  } | null;
  signatories: TransferSignatory[];
};

export type TransferApplicationPdfData = {
  orderId: number;
  formType: string;
  formVersion: string;
  title: string;
  offeringLabel: string;
  fisheryName: string;
  quotaTypeName: string;
  quantity: string;
  unitLabel: string;
  seller: TransferPartyDetails;
  buyer: TransferPartyDetails;
};
