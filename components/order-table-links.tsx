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
}: {
  orderId: number;
  settled: boolean;
}) {
  if (!settled) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
      <a
        href={taxInvoicePath(orderId, "quota")}
        className={tableLinkClassName}
      >
        Quota invoice
      </a>
      <a href={taxInvoicePath(orderId, "fee")} className={tableLinkClassName}>
        Fee invoice
      </a>
    </span>
  );
}
