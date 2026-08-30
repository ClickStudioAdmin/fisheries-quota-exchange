export function qldListingUsage(input: {
  quantity: number;
  unusedRaw: string;
  usedRaw: string;
  required?: boolean;
}):
  | { unused: number | null; used: number | null }
  | { error: string } {
  const unusedText = input.unusedRaw.trim();
  const usedText = input.usedRaw.trim();

  if (!unusedText && !usedText) {
    if (input.required) {
      return { error: "Enter unused and used quantities." };
    }
    return { unused: null, used: null };
  }

  if (!unusedText || !usedText) {
    return { error: "Enter both unused and used quantities." };
  }

  const unused = Number(unusedText);
  const used = Number(usedText);

  if (!Number.isFinite(unused) || unused < 0 || !Number.isFinite(used) || used < 0) {
    return { error: "Used and unused quantities cannot be negative." };
  }

  if (Math.abs(unused + used - input.quantity) > 1e-9) {
    return {
      error: "Unused and used quantities must add up to the listing quantity.",
    };
  }

  return { unused, used };
}

export function quotaUsageTooltip(
  unused: string | null | undefined,
  used: string | null | undefined,
  unitLabel: string,
): { label: string; value: string }[] | undefined {
  if (unused == null || used == null) {
    return undefined;
  }

  return [
    { label: "Unused", value: `${unused} ${unitLabel}` },
    { label: "Used", value: `${used} ${unitLabel}` },
  ];
}

export function quantityUsageTooltips(
  unused: string | null | undefined,
  used: string | null | undefined,
  unitLabel: string,
) {
  const details = quotaUsageTooltip(unused, used, unitLabel);
  return details ? { quantity: details } : undefined;
}

export function formatQuantityWithUsage(
  quantity: string,
  unitLabel: string,
  unused?: string | null,
  used?: string | null,
) {
  const total = `${quantity} ${unitLabel}`;
  if (unused == null || used == null) {
    return total;
  }

  return `${total} (${unused} unused / ${used} used)`;
}
