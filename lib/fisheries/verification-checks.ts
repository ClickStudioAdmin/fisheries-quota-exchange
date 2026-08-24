const SHARED_HOLDING_CHECKS = [
  "Confirm this business is the quota holder named on the authority record.",
  "Confirm the fishery and jurisdiction match that record.",
  "Confirm the quantity and unit match that record. Verifying this holding does not write a new quota ledger row.",
  "Confirm this is not a duplicate of another holding for the same business and fishery.",
] as const;

const QLD_HOLDING_CHECKS = [
  "Confirm the business has a Queensland fisheries client number and primary commercial fishing licence on Business Settings → Details.",
  "This check is not a Fisheries Queensland transfer. A later sale still uses the Queensland transfer documents.",
] as const;

const QLD_CUSTODIAL_INBOUND_CHECKS = [
  "Confirm this is a temporary FishNet transfer into FQX custody — FQX does not own this quota.",
  "Confirm the fishery, quantity, and unit match what was transferred to FQX on FishNet.",
  "Confirm the FishNet reference / transfer evidence for the inbound temporary transfer.",
  "Confirm the business has a Queensland fisheries client number and primary commercial fishing licence on Business Settings → Details.",
  "Verifying custodial inbound does not list the quota. The member lists lease offerings from this holding after it is verified.",
] as const;

export function holdingVerificationChecks(
  jurisdictionCode: string | null | undefined,
  custodyKind: "MEMBER" | "FQX_CUSTODIAL" = "MEMBER",
) {
  if (custodyKind === "FQX_CUSTODIAL") {
    return [...QLD_CUSTODIAL_INBOUND_CHECKS];
  }

  if (jurisdictionCode === "QLD") {
    return [...SHARED_HOLDING_CHECKS, ...QLD_HOLDING_CHECKS];
  }

  return [...SHARED_HOLDING_CHECKS];
}
