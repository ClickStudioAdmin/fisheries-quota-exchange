import Link from "next/link";
import { tableLinkClassName } from "@/components/data-table";

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
    <a href={`/orders/${orderId}/invoice`} className={tableLinkClassName}>
      Tax Invoice
    </a>
  );
}
