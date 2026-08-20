import type { TaxInvoiceKind } from "./types";

export function canDownloadTaxInvoice(input: {
  kind: TaxInvoiceKind;
  isAdmin: boolean;
  isBuyer: boolean;
  isSeller: boolean;
}) {
  if (input.isAdmin || input.isSeller) {
    return true;
  }

  return input.kind === "quota" && input.isBuyer;
}
