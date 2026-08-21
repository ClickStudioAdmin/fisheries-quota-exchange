import type { SigningChannel } from "@/lib/transfers/signing-channel";

export type PlatformSettings = {
  sale_fee_percent: string;
  lease_fee_percent: string;
  allow_registrations: boolean;
  auto_approve_holdings: boolean;
  auto_approve_listings: boolean;
  disabled_emails: string[];
  qld_default_signing_channel: SigningChannel;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  sale_fee_percent: "0",
  lease_fee_percent: "0",
  allow_registrations: true,
  auto_approve_holdings: true,
  auto_approve_listings: false,
  disabled_emails: [],
  qld_default_signing_channel: "OFFLINE",
};

export function formatFeePercent(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "0%";
  }

  return `${amount}%`;
}

export function feePercentForOffering(
  settings: PlatformSettings,
  offering: "SALE" | "LEASE",
) {
  return offering === "LEASE"
    ? settings.lease_fee_percent
    : settings.sale_fee_percent;
}

export function platformFeeLabel(
  settings: PlatformSettings,
  offering: "SALE" | "LEASE",
) {
  const amount = Number(feePercentForOffering(settings, offering));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return `${formatFeePercent(amount)} platform fee, paid by the seller`;
}

export function platformFeeDisclosure(settings: PlatformSettings) {
  const sale = Number(settings.sale_fee_percent);
  const lease = Number(settings.lease_fee_percent);
  const parts: string[] = [];

  if (Number.isFinite(sale) && sale > 0) {
    parts.push(`${formatFeePercent(sale)} on sales`);
  }

  if (Number.isFinite(lease) && lease > 0) {
    parts.push(`${formatFeePercent(lease)} on leases`);
  }

  if (parts.length === 0) {
    return null;
  }

  return `Platform fee: ${parts.join(", ")}. Deducted from the seller at settlement.`;
}
