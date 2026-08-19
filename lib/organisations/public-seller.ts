export const PRIVATE_SELLER_LABEL = "Private Seller";
export const PRIVATE_BUYER_LABEL = "Private Buyer";

export type PublicIdentityDisplay = {
  label: string;
  tooltip: string | null;
};

export type PublicSellerDisplay = PublicIdentityDisplay;

export function publicIdentityDisplay({
  name,
  hideIdentity,
  viewerIsMember,
  isPlatformAdmin: admin,
  hiddenLabel,
}: {
  name: string;
  hideIdentity: boolean;
  viewerIsMember: boolean;
  isPlatformAdmin: boolean;
  hiddenLabel: string;
}): PublicIdentityDisplay {
  if (!hideIdentity || viewerIsMember) {
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
  viewerIsSellerMember,
  isPlatformAdmin,
}: {
  sellerName: string;
  hideIdentity: boolean;
  viewerIsSellerMember: boolean;
  isPlatformAdmin: boolean;
}): PublicSellerDisplay {
  return publicIdentityDisplay({
    name: sellerName,
    hideIdentity,
    viewerIsMember: viewerIsSellerMember,
    isPlatformAdmin,
    hiddenLabel: PRIVATE_SELLER_LABEL,
  });
}

export function publicBuyerDisplay({
  buyerName,
  hideIdentity,
  viewerIsBuyerMember,
  isPlatformAdmin,
}: {
  buyerName: string;
  hideIdentity: boolean;
  viewerIsBuyerMember: boolean;
  isPlatformAdmin: boolean;
}): PublicIdentityDisplay {
  return publicIdentityDisplay({
    name: buyerName,
    hideIdentity,
    viewerIsMember: viewerIsBuyerMember,
    isPlatformAdmin,
    hiddenLabel: PRIVATE_BUYER_LABEL,
  });
}
