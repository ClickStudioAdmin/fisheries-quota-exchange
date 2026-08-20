import Link from "next/link";
import { tableLinkClassName } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { TransferPrepareForm } from "@/components/transfer-prepare-form";
import { TransferPartyUploadForm } from "@/components/transfer-party-upload-form";
import { qldTransferPublicStatusLabel } from "@/lib/orders/types";
import { accountSettingsPath } from "@/lib/organisations/paths";
import { transferProfileFieldLabels } from "@/lib/transfers/profile";
import { transferDocumentPath } from "@/lib/transfers/types";
import type { TransferWorkspace } from "@/lib/transfers/queries";

export function TransferOrderPanel({
  workspace,
  viewerOrganisationId,
  canPrepare,
}: {
  workspace: TransferWorkspace;
  viewerOrganisationId: number | null;
  canPrepare: boolean;
}) {
  if (workspace.process.usesSimulatedTransfer) {
    return null;
  }

  const status = workspace.application?.status ?? "READY";
  const isBuyer = viewerOrganisationId === workspace.order.buyer_organisation_id;
  const isSeller =
    viewerOrganisationId === workspace.order.seller_organisation_id;
  const ownMissing = isBuyer
    ? workspace.buyerMissing
    : isSeller
      ? workspace.sellerMissing
      : [];
  const otherMissing = isBuyer
    ? workspace.sellerMissing
    : isSeller
      ? workspace.buyerMissing
      : [...workspace.buyerMissing, ...workspace.sellerMissing];
  const complete =
    workspace.buyerMissing.length === 0 && workspace.sellerMissing.length === 0;
  const sellerDownload = isSeller && workspace.latestUnsigned;
  const buyerDownload =
    isBuyer &&
    status === "AWAITING_BUYER_SIGNATURE" &&
    workspace.latestSellerSigned;
  const sellerUpload =
    canPrepare && isSeller && status === "AWAITING_SELLER_SIGNATURE";
  const buyerUpload =
    canPrepare && isBuyer && status === "AWAITING_BUYER_SIGNATURE";

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Queensland transfer</h2>
      <p className="mt-2 text-sm text-ink-muted">
        The seller signs and witnesses first, then uploads that file. FQX checks
        it before the buyer can download it. Signatures are not collected in
        the browser.
      </p>
      <div className="mt-4">
        <StatusBadge label={qldTransferPublicStatusLabel(status)} />
      </div>
      {workspace.application?.fq_reference ? (
        <p className="mt-2 text-sm text-ink-muted">
          Fisheries Queensland reference: {workspace.application.fq_reference}
        </p>
      ) : null}
      {workspace.application?.notes &&
      (status === "ACTION_REQUIRED" ||
        status === "AWAITING_SELLER_SIGNATURE") ? (
        <p className="mt-2 text-sm text-ink-muted">
          {workspace.application.notes}
        </p>
      ) : null}
      {ownMissing.length > 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          This business is missing{" "}
          {transferProfileFieldLabels(ownMissing).join(", ")}. Complete them on{" "}
          <Link href={accountSettingsPath()} className="underline">
            Business Settings → Details
          </Link>
          .
        </p>
      ) : null}
      {otherMissing.length > 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          The other business still needs to complete transfer details on
          Business Settings → Details.
        </p>
      ) : null}
      {complete && !workspace.latestUnsigned && canPrepare ? (
        <div className="mt-6">
          <TransferPrepareForm orderId={workspace.order.id} />
        </div>
      ) : null}
      {sellerDownload || buyerDownload ? (
        <div className="mt-6">
          {sellerDownload ? (
            <PdfDownloadLink
              href={transferDocumentPath(workspace.order.id, sellerDownload.id)}
            >
              Download application PDF
            </PdfDownloadLink>
          ) : null}
          {buyerDownload && workspace.latestSellerSigned ? (
            <PdfDownloadLink
              href={transferDocumentPath(
                workspace.order.id,
                workspace.latestSellerSigned.id,
              )}
            >
              Download seller-signed PDF
            </PdfDownloadLink>
          ) : null}
          {sellerUpload ? (
            <TransferPartyUploadForm
              orderId={workspace.order.id}
              label="Upload seller-signed PDF"
            />
          ) : null}
          {buyerUpload ? (
            <TransferPartyUploadForm
              orderId={workspace.order.id}
              label="Upload completed pack"
            />
          ) : null}
          {canPrepare &&
          (status === "ACTION_REQUIRED" || status === "ADMIN_REVIEW") ? (
            <div className="mt-4">
              <TransferPrepareForm orderId={workspace.order.id} />
            </div>
          ) : null}
        </div>
      ) : null}
      {isBuyer &&
      (status === "READY" ||
        status === "AWAITING_SELLER_SIGNATURE" ||
        status === "AWAITING_SELLER_PACK_REVIEW") ? (
        <p className="mt-4 text-sm text-ink-muted">
          The seller signs first. FQX will email you the seller-signed form when
          it is ready.
        </p>
      ) : null}
      {isSeller && status === "AWAITING_SELLER_PACK_REVIEW" ? (
        <p className="mt-4 text-sm text-ink-muted">
          FQX has your signed form and is checking it before the buyer can
          download it.
        </p>
      ) : null}
    </div>
  );
}

function PdfDownloadLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      href={href}
      className={`${tableLinkClassName} inline-flex items-center gap-1.5`}
    >
      <PdfFileIcon className="h-4 w-4 shrink-0" />
      {children}
    </a>
  );
}

function PdfFileIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M9.5 16.5h5M9.5 13h5" />
    </svg>
  );
}
