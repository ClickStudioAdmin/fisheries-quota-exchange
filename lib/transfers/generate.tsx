import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { TransferApplicationDocument } from "@/lib/transfers/application-pdf";
import type { TransferApplicationPdfData } from "@/lib/transfers/application-data";
import { fillOfficialTransferApplication } from "@/lib/transfers/fdu1465";

export async function generateTransferApplicationPdf(
  data: TransferApplicationPdfData,
) {
  if (data.formType === "FDU1465" || data.formType === "FDU1469") {
    return fillOfficialTransferApplication(data);
  }

  return renderToBuffer(<TransferApplicationDocument data={data} />);
}
