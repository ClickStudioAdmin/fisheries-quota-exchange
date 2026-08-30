import type { ListingType } from "./types";

const SHARED_LISTING_CHECKS = [
  "Confirm the seller business matches the holding and can sell this offering.",
  "Confirm the holding is verified. Approving a listing does not write a new quota ledger row.",
  "Confirm the quantity is covered by the holding after other open listings and reservations.",
  "Confirm the offering, unit price, and expiry match what the seller intended.",
] as const;

const AUCTION_LISTING_CHECKS = [
  "Confirm the auction start, reserve (if any), and bid increment are set.",
] as const;

const QLD_LISTING_CHECKS = [
  "Confirm the business has a Queensland fisheries client number and primary commercial fishing licence on Business Settings → Details.",
  "Approving this listing is not a Fisheries Queensland transfer. A later sale or lease still uses the Queensland transfer process.",
] as const;

export function listingApprovalChecks(
  jurisdictionCode: string | null | undefined,
  listingType: ListingType,
) {
  const checks = [
    ...SHARED_LISTING_CHECKS,
    ...(listingType === "AUCTION" ? AUCTION_LISTING_CHECKS : []),
    ...(jurisdictionCode === "QLD" ? QLD_LISTING_CHECKS : []),
  ];

  return checks;
}
