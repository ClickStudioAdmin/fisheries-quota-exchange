export function audToCents(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid amount.");
  }

  return Math.round(amount * 100);
}

export function centsToAud(cents: number) {
  if (!Number.isFinite(cents)) {
    throw new Error("Invalid amount.");
  }

  return cents / 100;
}

/** Listed quota amount charged to the buyer. Platform fee is not added on top. */
export function orderChargeAud(amountAud: string | number) {
  return Number(amountAud);
}

/** Seller Transfer after FQX keeps the platform fee from the listed amount. */
export function orderSellerPayoutAud(
  amountAud: string | number,
  feeAud: string | number,
  chargedAud?: string | number,
) {
  const listedCents = audToCents(amountAud);
  const feeCents = audToCents(feeAud);
  const chargedCents =
    chargedAud == null ? listedCents : audToCents(chargedAud);

  if (chargedCents > listedCents) {
    return centsToAud(listedCents);
  }

  const payoutCents = listedCents - feeCents;

  if (payoutCents < 0) {
    throw new Error("Seller payout would be negative.");
  }

  return centsToAud(Math.min(payoutCents, chargedCents));
}
