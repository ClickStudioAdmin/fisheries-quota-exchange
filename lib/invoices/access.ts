import type { TaxInvoiceKind } from "./types";

export function canDownloadTaxInvoice(input: {
  kind: TaxInvoiceKind;
  isAdmin: boolean;
  isBuyer: boolean;
  isSeller: boolean;
}) {
  if (input.isAdmin) {
    return true;
  }

  if (input.kind === "quota") {
    return input.isBuyer;
  }

  if (input.kind === "fee") {
    return input.isSeller;
  }

  return false;
}
