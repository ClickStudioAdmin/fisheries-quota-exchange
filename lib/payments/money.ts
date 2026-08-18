/** Stripe Australia standard domestic card pricing. */
export const STRIPE_CARD_FEE_PERCENT = 1.75;
export const STRIPE_CARD_FEE_FIXED_AUD = 0.3;

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

export function stripeCardFeeRateLabel() {
  return `${STRIPE_CARD_FEE_PERCENT}% + A$${STRIPE_CARD_FEE_FIXED_AUD.toFixed(2)}`;
}

/**
 * Gross-up so that after Stripe takes percent + fixed from the charge,
 * FQX still nets the listed quota amount.
 */
export function stripeCardFeeCents(listedCents: number) {
  if (!Number.isInteger(listedCents) || listedCents < 0) {
    throw new Error("Invalid amount.");
  }

  if (listedCents === 0) {
    return 0;
  }

  const bps = Math.round(STRIPE_CARD_FEE_PERCENT * 100);
  const fixedCents = audToCents(STRIPE_CARD_FEE_FIXED_AUD);
  const chargeCents = Math.ceil(
    ((listedCents + fixedCents) * 10000) / (10000 - bps),
  );

  return chargeCents - listedCents;
}

export function stripeCardFeeAud(amountAud: string | number) {
  return centsToAud(stripeCardFeeCents(audToCents(amountAud)));
}

/** Listed quota amount plus Stripe card processing, so the buyer covers the card fee. */
export function orderChargeAud(amountAud: string | number) {
  const listedCents = audToCents(amountAud);

  return centsToAud(listedCents + stripeCardFeeCents(listedCents));
}

/** True when Checkout charged listed + platform fee (early Phase 9). */
export function buyerPaidPlatformFeeOnTop(
  amountAud: string | number,
  feeAud: string | number,
  chargedAud: string | number,
) {
  const feeCents = audToCents(feeAud);

  return (
    feeCents > 0 &&
    audToCents(chargedAud) === audToCents(amountAud) + feeCents
  );
}

export function buyerCardFeeAud(
  amountAud: string | number,
  feeAud: string | number,
  chargedAud: string | number,
) {
  if (buyerPaidPlatformFeeOnTop(amountAud, feeAud, chargedAud)) {
    return 0;
  }

  return centsToAud(
    Math.max(0, audToCents(chargedAud) - audToCents(amountAud)),
  );
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

  if (
    chargedAud != null &&
    buyerPaidPlatformFeeOnTop(amountAud, feeAud, chargedAud)
  ) {
    return centsToAud(listedCents);
  }

  const payoutCents = listedCents - feeCents;

  if (payoutCents < 0) {
    throw new Error("Seller payout would be negative.");
  }

  return centsToAud(Math.min(payoutCents, chargedCents));
}
