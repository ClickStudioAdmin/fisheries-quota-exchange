import type { JurisdictionTransferProcess } from "./types";

const QLD_REQUIRED = [
  "entity_kind",
  "legal_name",
  "abn",
  "acn",
  "mobile",
  "registered_address",
  "postal_address",
  "qld_client_number",
  "qld_licence_number",
] as const;

const QLD_SHARED_CHECKS = [
  "Confirm both parties have a Queensland fisheries client number and a primary commercial fishing licence.",
  "Confirm entity kind, ABN, and ACN (companies) match the businesses named on this order.",
  "Confirm registered addresses. If postal address is different, check that too.",
  "Quota is already reserved on this order. Approving compliance does not move quota. Fisheries Queensland approval later must not apply quota again.",
] as const;

export const qldSaleProcess: JurisdictionTransferProcess = {
  code: "QLD_SALE",
  jurisdictionCode: "QLD",
  offering: "SALE",
  formType: "FDU1465",
  formVersion: "V09/23",
  title: "Permanent transfer of quota and/or effort units (FDU1465)",
  usesSimulatedTransfer: false,
  requiredProfileFields: QLD_REQUIRED,
  complianceChecks: [
    ...QLD_SHARED_CHECKS,
    "After approval, FQX prepares an unsigned FDU1465 (V09/23) from these details. Parties download it, sign and witness it offline, then return the completed pack to FQX. A checkbox is not a witness.",
    "Do not record Fisheries Queensland submission at this step. That happens in Transfer after the signed pack is uploaded.",
  ],
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
  complianceChecks: [
    ...QLD_SHARED_CHECKS,
    "After approval, FQX prepares an unsigned Queensland lease / temporary transfer application from these details. Parties download it, sign and witness it offline, then return the completed pack to FQX.",
    "Do not record Fisheries Queensland submission at this step. That happens in Transfer after the signed pack is uploaded.",
  ],
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
  complianceChecks: [
    "Confirm buyer and seller identities match this order.",
    "Confirm the fishery, offering, and quantity.",
    "Quota is already reserved. Approving compliance starts the simulated transfer step, not a regulator submission.",
  ],
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
