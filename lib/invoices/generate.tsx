import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { TaxInvoiceDocument } from "@/lib/invoices/tax-invoice";
import type { TaxInvoiceData } from "@/lib/invoices/types";

export async function generateTaxInvoicePdf(data: TaxInvoiceData) {
  return renderToBuffer(<TaxInvoiceDocument data={data} />);
}
