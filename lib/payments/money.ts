export function audToCents(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid amount.");
  }

  return Math.round(amount * 100);
}

export function orderChargeAud(amountAud: string | number, feeAud: string | number) {
  return Number(amountAud) + Number(feeAud);
}
