import type { JurisdictionTransferProcess } from "./types";

const QLD_REQUIRED = [
  "entity_kind",
  "legal_name",
  "abn",
  "acn",
  "phone_or_mobile",
  "registered_address",
  "postal_address",
  "qld_client_number",
  "qld_licence_number",
] as const;

export const qldSaleProcess: JurisdictionTransferProcess = {
  code: "QLD_SALE",
  jurisdictionCode: "QLD",
  offering: "SALE",
  formType: "FDU1465",
  formVersion: "V02/26",
  title: "Permanent transfer of quota and/or effort units (FDU1465)",
  usesSimulatedTransfer: false,
  requiredProfileFields: QLD_REQUIRED,
};

export const qldLeaseProcess: JurisdictionTransferProcess = {
  code: "QLD_LEASE",
  jurisdictionCode: "QLD",
  offering: "LEASE",
  formType: "FDU_LEASE",
  formVersion: "V01/26",
  title: "Queensland lease / temporary transfer application",
  usesSimulatedTransfer: false,
  requiredProfileFields: QLD_REQUIRED,
};

export const simulatedProcess: JurisdictionTransferProcess = {
  code: "SIMULATED",
  jurisdictionCode: null,
  offering: null,
  formType: null,
  formVersion: null,
  title: "Simulated authority transfer",
  usesSimulatedTransfer: true,
  requiredProfileFields: [],
};

export function getTransferProcess(
  jurisdictionCode: string | null | undefined,
  offering: "SALE" | "LEASE",
): JurisdictionTransferProcess {
  if (jurisdictionCode === "QLD" && offering === "SALE") {
    return qldSaleProcess;
  }

  if (jurisdictionCode === "QLD" && offering === "LEASE") {
    return qldLeaseProcess;
  }

  return simulatedProcess;
}
