export const PRIVATE_SELLER_LABEL = "Private Seller";
export const PRIVATE_BUYER_LABEL = "Private Buyer";

export type PublicIdentityDisplay = {
  label: string;
  tooltip: string | null;
};

export type PublicSellerDisplay = PublicIdentityDisplay;

function asIntegerId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isHideIdentityFlag(value: unknown) {
  return value === true || value === "true" || value === "t";
}

export function parseOrganisationHideIdentityRows(
  data: unknown,
): Map<number, boolean> {
  const hidden = new Map<number, boolean>();
  const rows = Array.isArray(data) ? data : data == null ? [] : [data];

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }

    const record = row as Record<string, unknown>;
    const id = asIntegerId(record.organisation_id ?? record.id);
    if (id != null) {
      hidden.set(id, isHideIdentityFlag(record.hide_identity));
    }
  }

  return hidden;
}

export function publicIdentityDisplay({
  name,
  hideIdentity,
  isPlatformAdmin: admin,
  hiddenLabel,
}: {
  name: string;
  hideIdentity: boolean;
  isPlatformAdmin: boolean;
  hiddenLabel: string;
}): PublicIdentityDisplay {
  if (!hideIdentity) {
    return { label: name, tooltip: null };
  }

  return {
    label: hiddenLabel,
    tooltip: admin ? name : null,
  };
}

export function publicSellerDisplay({
  sellerName,
  hideIdentity,
  isPlatformAdmin,
}: {
  sellerName: string;
  hideIdentity: boolean;
  isPlatformAdmin: boolean;
}): PublicSellerDisplay {
  return publicIdentityDisplay({
    name: sellerName,
    hideIdentity,
    isPlatformAdmin,
    hiddenLabel: PRIVATE_SELLER_LABEL,
  });
}

export function publicBuyerDisplay({
  buyerName,
  hideIdentity,
  isPlatformAdmin,
}: {
  buyerName: string;
  hideIdentity: boolean;
  isPlatformAdmin: boolean;
}): PublicIdentityDisplay {
  return publicIdentityDisplay({
    name: buyerName,
    hideIdentity,
    isPlatformAdmin,
    hiddenLabel: PRIVATE_BUYER_LABEL,
  });
}
