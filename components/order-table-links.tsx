import Link from "next/link";
import { tableLinkClassName } from "@/components/data-table";

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v11" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

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
    <a
      href={`/orders/${orderId}/invoice`}
      className="inline-flex text-ink hover:text-sea"
      aria-label="Download tax invoice"
      title="Download tax invoice"
    >
      <DownloadIcon />
    </a>
  );
}
