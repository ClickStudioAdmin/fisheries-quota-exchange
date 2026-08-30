import type { TransferApplicationPdfData } from "./application-data";
import {
  FDU1465_TEMPLATE_FILENAME,
  FDU1469_TEMPLATE_FILENAME,
  fdu1465FieldValues,
  fdu1469FieldValues,
} from "./fdu1465-map";
import { fillOfficialPdf } from "./official-pdf";

export async function fillOfficialTransferApplication(
  data: TransferApplicationPdfData,
) {
  if (data.formType === "FDU1465") {
    return fillOfficialPdf(FDU1465_TEMPLATE_FILENAME, fdu1465FieldValues(data));
  }

  if (data.formType === "FDU1469") {
    return fillOfficialPdf(FDU1469_TEMPLATE_FILENAME, fdu1469FieldValues(data));
  }

  throw new Error(`No official template for ${data.formType}.`);
}
