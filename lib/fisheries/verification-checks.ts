const SHARED_HOLDING_CHECKS = [
  "Confirm this business is the quota holder named on the authority record.",
  "Confirm the fishery and jurisdiction match that record.",
  "Confirm the quantity and unit match that record. Verifying this holding does not write a new quota ledger row.",
  "Confirm this is not a duplicate of another holding for the same business and fishery.",
] as const;

const QLD_HOLDING_CHECKS = [
  "Confirm the business has a Queensland fisheries client number and primary commercial fishing licence on Business Settings → Details.",
  "This check is not a Fisheries Queensland transfer. A later sale or lease still uses the Queensland transfer process.",
] as const;

export function holdingVerificationChecks(
  jurisdictionCode: string | null | undefined,
) {
  if (jurisdictionCode === "QLD") {
    return [...SHARED_HOLDING_CHECKS, ...QLD_HOLDING_CHECKS];
  }

  return [...SHARED_HOLDING_CHECKS];
}
