import type {
  TransferApplicationStatus,
  TransferDocumentType,
} from "./types";

export function canDownloadTransferDocument(input: {
  documentType: TransferDocumentType;
  applicationStatus: TransferApplicationStatus | null;
  isAdmin: boolean;
  isBuyer: boolean;
  isSeller: boolean;
}) {
  if (input.isAdmin) {
    return true;
  }

  const status = input.applicationStatus ?? "READY";
  const buyerReleased =
    status === "AWAITING_BUYER_SIGNATURE" ||
    status === "ADMIN_REVIEW" ||
    status === "SUBMITTED" ||
    status === "PROCESSING" ||
    status === "APPROVED";
  const completePackVisible =
    status === "ADMIN_REVIEW" ||
    status === "SUBMITTED" ||
    status === "PROCESSING" ||
    status === "APPROVED";

  if (input.documentType === "UNSIGNED_APPLICATION") {
    return input.isSeller;
  }

  if (input.documentType === "SELLER_SIGNED") {
    return input.isSeller || (input.isBuyer && buyerReleased);
  }

  if (input.documentType === "SIGNED_PACK") {
    return (input.isSeller || input.isBuyer) && completePackVisible;
  }

  return false;
}
