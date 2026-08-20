import Link from "next/link";
import { tableLinkClassName } from "@/components/data-table";
import { taxInvoicePath } from "@/lib/invoices/types";

export function OrderTableLinks({ orderId }: { orderId: number }) {
  return (
    <Link
      href={`/orders/${orderId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={tableLinkClassName}
    >
      View
    </Link>
  );
}

export function OrderTableDownloads({
  orderId,
  settled,
  showQuotaInvoice = false,
  showFeeInvoice = false,
}: {
  orderId: number;
  settled: boolean;
  showQuotaInvoice?: boolean;
  showFeeInvoice?: boolean;
}) {
  if (!settled || (!showQuotaInvoice && !showFeeInvoice)) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
      {showQuotaInvoice ? (
        <a
          href={taxInvoicePath(orderId, "quota")}
          className={tableLinkClassName}
        >
          Quota invoice
        </a>
      ) : null}
      {showFeeInvoice ? (
        <a href={taxInvoicePath(orderId, "fee")} className={tableLinkClassName}>
          Fee invoice
        </a>
      ) : null}
    </span>
  );
}
