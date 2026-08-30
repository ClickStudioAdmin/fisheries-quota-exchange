import type { JurisdictionTransferProcess } from "./types";

const QLD_REQUIRED = [
  "entity_kind",
  "legal_name",
  "abn",
  "acn",
  "date_of_birth",
  "mobile",
  "registered_address",
  "postal_address",
  "qld_client_number",
  "qld_licence_number",
] as const;

const QLD_SHARED_CHECKS = [
  "Confirm both parties have a Queensland fisheries client number and a primary commercial fishing licence.",
  "Confirm entity kind, ABN, ACN (companies), and date of birth (individuals) match the businesses named on this order.",
  "Confirm registered addresses. If postal address is different, check that too.",
  "Quota is already reserved on this order. Approving compliance does not move quota. Fisheries Queensland approval later must not apply quota again.",
] as const;

const QLD_SELLER_PACK_CHECKS = [
  "Confirm the transferor (seller) has signed.",
  "Confirm the seller witness block is completed.",
  "Confirm pre-filled names, addresses, client numbers, and quantity look unaltered and match this order.",
  "Confirm this is the FQX application for this order, not a separate copy.",
] as const;

export const qldSaleProcess: JurisdictionTransferProcess = {
  code: "QLD_SALE",
  jurisdictionCode: "QLD",
  offering: "SALE",
  formType: "FDU1465",
  formVersion: "V09/23",
  title: "Permanent transfer of quota and/or effort units (FDU1465)",
  usesSimulatedTransfer: false,
  usesFishNetOutbound: false,
  requiredProfileFields: QLD_REQUIRED,
  complianceChecks: [
    ...QLD_SHARED_CHECKS,
    "After approval, FQX prepares an unsigned FDU1465 (V09/23) from these details. The seller signs and witnesses first, uploads it, and FQX checks that form before the buyer can access it. A checkbox is not a witness.",
    "Do not record Fisheries Queensland submission at this step. That happens in Transfer after the completed pack is uploaded.",
  ],
  sellerPackChecks: QLD_SELLER_PACK_CHECKS,
  outboundChecks: [],
};

/** QLD leases use temporary FQX FishNet custody — no FDU1469 paperwork. */
export const qldLeaseProcess: JurisdictionTransferProcess = {
  code: "QLD_LEASE",
  jurisdictionCode: "QLD",
  offering: "LEASE",
  formType: null,
  formVersion: null,
  title: "Queensland custodial lease (FishNet outbound)",
  usesSimulatedTransfer: false,
  usesFishNetOutbound: true,
  requiredProfileFields: QLD_REQUIRED,
  complianceChecks: [],
  sellerPackChecks: [],
  outboundChecks: [
    "Confirm payment has cleared for this lease order.",
    "Confirm the custodial quantity on the seller holding still covers this order.",
    "Confirm buyer identity and Queensland client / licence details for FishNet outbound.",
    "Complete the temporary FishNet transfer from FQX custody to the buyer, then mark outbound complete. That settles the order and moves the quota ledger.",
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
  usesFishNetOutbound: false,
  requiredProfileFields: [],
  complianceChecks: [
    "Confirm buyer and seller identities match this order.",
    "Confirm the fishery, offering, and quantity.",
    "Quota is already reserved. Approving compliance starts the simulated transfer step, not a regulator submission.",
  ],
  sellerPackChecks: [],
  outboundChecks: [],
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
