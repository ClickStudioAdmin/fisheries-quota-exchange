export const PRIVATE_SELLER_LABEL = "Private Seller";

export type PublicSellerDisplay = {
  label: string;
  tooltip: string | null;
};

export function publicSellerDisplay({
  sellerName,
  hideIdentity,
  viewerIsSellerMember,
  isPlatformAdmin: admin,
}: {
  sellerName: string;
  hideIdentity: boolean;
  viewerIsSellerMember: boolean;
  isPlatformAdmin: boolean;
}): PublicSellerDisplay {
  if (!hideIdentity || viewerIsSellerMember) {
    return { label: sellerName, tooltip: null };
  }

  return {
    label: PRIVATE_SELLER_LABEL,
    tooltip: admin ? sellerName : null,
  };
}
