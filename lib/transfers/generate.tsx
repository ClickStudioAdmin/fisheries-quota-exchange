import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { TransferApplicationDocument } from "@/lib/transfers/application-pdf";
import type { TransferApplicationPdfData } from "@/lib/transfers/application-data";
import { fillFdu1465Application } from "@/lib/transfers/fdu1465";

export async function generateTransferApplicationPdf(
  data: TransferApplicationPdfData,
) {
  if (data.formType === "FDU1465") {
    return fillFdu1465Application(data);
  }

  return renderToBuffer(<TransferApplicationDocument data={data} />);
}

export function unsignedTransferFilename(input: {
  orderId: number;
  formType: string;
  formVersion: string;
}) {
  const form = input.formType.replace(/[^A-Za-z0-9]+/g, "-");
  const version = input.formVersion.replace(/[^A-Za-z0-9]+/g, "");
  return `FQX-order-${input.orderId}-${form}-${version}-unsigned.pdf`;
}
