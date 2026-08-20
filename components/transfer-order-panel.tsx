import Link from "next/link";
import { buttonClassName } from "@/components/auth-card";
import { TransferPrepareForm } from "@/components/transfer-prepare-form";
import { accountSettingsPath } from "@/lib/organisations/paths";
import { transferProfileFieldLabels } from "@/lib/transfers/profile";
import {
  transferApplicationStatusLabel,
  transferDocumentPath,
} from "@/lib/transfers/types";
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
  const ownMissing =
    viewerOrganisationId === workspace.order.buyer_organisation_id
      ? workspace.buyerMissing
      : viewerOrganisationId === workspace.order.seller_organisation_id
        ? workspace.sellerMissing
        : [];
  const otherMissing =
    viewerOrganisationId === workspace.order.buyer_organisation_id
      ? workspace.sellerMissing
      : viewerOrganisationId === workspace.order.seller_organisation_id
        ? workspace.buyerMissing
        : [...workspace.buyerMissing, ...workspace.sellerMissing];
  const complete =
    workspace.buyerMissing.length === 0 && workspace.sellerMissing.length === 0;

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Queensland transfer</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Application prepared from your business details. Sign and witness the
        PDF offline. FQX does not collect signatures in the browser.
      </p>
      <p className="mt-4 text-sm text-ink">
        {transferApplicationStatusLabel(status)}
      </p>
      {workspace.application?.fq_reference ? (
        <p className="mt-2 text-sm text-ink-muted">
          Fisheries Queensland reference: {workspace.application.fq_reference}
        </p>
      ) : null}
      {workspace.application?.notes && status === "ACTION_REQUIRED" ? (
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
      {workspace.latestUnsigned ? (
        <div className="mt-6">
          <a
            href={transferDocumentPath(
              workspace.order.id,
              workspace.latestUnsigned.id,
            )}
            className={`${buttonClassName} inline-block`}
          >
            Download application PDF
          </a>
          {canPrepare &&
          (status === "ACTION_REQUIRED" || status === "ADMIN_REVIEW") ? (
            <div className="mt-4">
              <TransferPrepareForm orderId={workspace.order.id} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
