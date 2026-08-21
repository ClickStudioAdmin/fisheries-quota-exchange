import Link from "next/link";
import { PdfDownloadLink } from "@/components/pdf-download-link";
import { StatusBadge } from "@/components/status-badge";
import { TransferPrepareForm } from "@/components/transfer-prepare-form";
import { TransferPartyUploadForm } from "@/components/transfer-party-upload-form";
import { SignOnlineForm } from "@/components/sign-online-form";
import { qldTransferPublicStatusLabel } from "@/lib/orders/types";
import { isPandadocChannel } from "@/lib/transfers/signing-channel";
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
  const pandadoc = isPandadocChannel(workspace.application?.signing_channel);
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
  const sellerDownload =
    !pandadoc && isSeller && workspace.latestUnsigned;
  const buyerDownload =
    !pandadoc &&
    isBuyer &&
    status === "AWAITING_BUYER_SIGNATURE" &&
    workspace.latestSellerSigned;
  const signedPackDownload =
    Boolean(workspace.latestSignedPack) &&
    (isBuyer || isSeller) &&
    (status === "ADMIN_REVIEW" ||
      status === "SUBMITTED" ||
      status === "PROCESSING" ||
      status === "APPROVED");
  const sellerUpload =
    !pandadoc &&
    canPrepare &&
    isSeller &&
    status === "AWAITING_SELLER_SIGNATURE";
  const buyerUpload =
    !pandadoc && canPrepare && isBuyer && status === "AWAITING_BUYER_SIGNATURE";
  const sellerSignOnline =
    pandadoc &&
    canPrepare &&
    isSeller &&
    status === "AWAITING_SIGNATURES" &&
    !workspace.application?.pandadoc_seller_completed_at;
  const buyerSignOnline =
    pandadoc &&
    canPrepare &&
    isBuyer &&
    status === "AWAITING_SIGNATURES" &&
    !workspace.application?.pandadoc_buyer_completed_at;
  const showDocuments =
    Boolean(sellerDownload || buyerDownload || signedPackDownload);

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Queensland transfer</h2>
      <p className="mt-2 text-sm text-ink-muted">
        {pandadoc
          ? "Buyer and seller Sign Online at the same time. Have your witness physically present. FQX waits for PandaDoc to confirm each signature."
          : "The seller signs and witnesses first, then uploads that file. FQX checks it before the buyer can download it. Signatures are not collected in the browser."}
      </p>
      <div className="mt-4">
        <StatusBadge
          label={qldTransferPublicStatusLabel(
            status,
            workspace.application?.signing_channel,
          )}
        />
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
          {pandadoc && isBuyer ? (
            <p className="text-sm text-ink-muted">
              FQX will prepare the application. You and the seller can Sign
              Online at the same time after that.
            </p>
          ) : (
            <TransferPrepareForm orderId={workspace.order.id} />
          )}
        </div>
      ) : null}
      {showDocuments ? (
        <div className="mt-6">
          <div className="flex max-w-lg flex-col gap-2">
          {sellerDownload ? (
            <PdfDownloadLink
              href={transferDocumentPath(workspace.order.id, sellerDownload.id)}
              hint={sellerDownload.original_filename ?? "PDF document"}
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
              hint={
                workspace.latestSellerSigned.original_filename ?? "PDF document"
              }
            >
              Download seller-signed PDF
            </PdfDownloadLink>
          ) : null}
          {signedPackDownload && workspace.latestSignedPack ? (
            <PdfDownloadLink
              href={transferDocumentPath(
                workspace.order.id,
                workspace.latestSignedPack.id,
              )}
              hint={
                workspace.latestSignedPack.original_filename ??
                "Signed application"
              }
            >
              Download signed application
            </PdfDownloadLink>
          ) : null}
          </div>
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
          isSeller &&
          (status === "ACTION_REQUIRED" ||
            (!pandadoc && status === "ADMIN_REVIEW")) ? (
            <div className="mt-4">
              <TransferPrepareForm orderId={workspace.order.id} />
            </div>
          ) : null}
        </div>
      ) : null}
      {sellerSignOnline || buyerSignOnline ? (
        <div className="mt-6">
          <SignOnlineForm orderId={workspace.order.id} />
        </div>
      ) : null}
      {pandadoc &&
      status === "AWAITING_SIGNATURES" &&
      ((isSeller && workspace.application?.pandadoc_seller_completed_at) ||
        (isBuyer && workspace.application?.pandadoc_buyer_completed_at)) ? (
        <p className="mt-4 text-sm text-ink-muted">
          FQX has your signature
          {isSeller && !workspace.application?.pandadoc_buyer_completed_at
            ? " and is waiting for the buyer."
            : isBuyer && !workspace.application?.pandadoc_seller_completed_at
              ? " and is waiting for the seller."
              : "."}
        </p>
      ) : null}
      {isBuyer &&
      !pandadoc &&
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
      {isBuyer &&
      (status === "ADMIN_REVIEW" ||
        status === "SUBMITTED" ||
        status === "PROCESSING") ? (
        <p className="mt-4 text-sm text-ink-muted">
          FQX has the completed pack
          {status === "ADMIN_REVIEW"
            ? " and is reviewing it."
            : " and has sent it to Fisheries Queensland."}{" "}
          You do not need to do anything.
        </p>
      ) : null}
    </div>
  );
}
