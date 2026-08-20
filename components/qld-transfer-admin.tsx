import {
  fieldClassName,
  tableButtonClassName,
} from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { transferProfileFieldLabels } from "@/lib/transfers/profile";
import {
  approveQldTransferAction,
  generateTransferDocumentAdminAction,
  recordFqSubmissionAction,
  recordTransferActionRequiredAction,
  recordTransferProcessingAction,
  uploadSignedPackAction,
} from "@/lib/transfers/actions";
import {
  transferApplicationStatusLabel,
  transferDocumentPath,
} from "@/lib/transfers/types";
import type { TransferWorkspace } from "@/lib/transfers/queries";

function queueFields(remaining: number[]) {
  return remaining.map((id) => (
    <input key={id} type="hidden" name="review_queue" value={id} />
  ));
}

export function QldTransferAdmin({
  workspace,
  reviewQueue = [],
}: {
  workspace: TransferWorkspace;
  reviewQueue?: number[];
}) {
  const remaining = reviewQueue.filter((id) => id !== workspace.order.id);
  const status = workspace.application?.status ?? "READY";
  const complete =
    workspace.buyerMissing.length === 0 && workspace.sellerMissing.length === 0;
  const canGenerate =
    complete &&
    status !== "SUBMITTED" &&
    status !== "PROCESSING" &&
    status !== "APPROVED";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-ink">
          {workspace.process.title}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {transferApplicationStatusLabel(status)}
          {workspace.process.formType
            ? ` · ${workspace.process.formType} ${workspace.process.formVersion}`
            : null}
        </p>
      </div>
      <ul className="space-y-1 text-sm text-ink-muted">
        <li>
          Seller details:{" "}
          {workspace.sellerMissing.length === 0
            ? "Complete"
            : `Missing ${transferProfileFieldLabels(workspace.sellerMissing).join(", ")}`}
        </li>
        <li>
          Buyer details:{" "}
          {workspace.buyerMissing.length === 0
            ? "Complete"
            : `Missing ${transferProfileFieldLabels(workspace.buyerMissing).join(", ")}`}
        </li>
        <li>
          Unsigned PDF: {workspace.latestUnsigned ? "Generated" : "Not generated"}
        </li>
        <li>
          Signed pack: {workspace.latestSignedPack ? "Uploaded" : "Not uploaded"}
        </li>
      </ul>
      {workspace.latestUnsigned ? (
        <a
          href={transferDocumentPath(
            workspace.order.id,
            workspace.latestUnsigned.id,
          )}
          className={`${tableButtonClassName} inline-block`}
        >
          Download unsigned PDF
        </a>
      ) : null}
      {workspace.latestSignedPack ? (
        <a
          href={transferDocumentPath(
            workspace.order.id,
            workspace.latestSignedPack.id,
          )}
          className={`${tableButtonClassName} inline-block`}
        >
          Download signed pack
        </a>
      ) : null}
      {canGenerate ? (
        <form action={generateTransferDocumentAdminAction}>
          <input type="hidden" name="order_id" value={workspace.order.id} />
          {queueFields(remaining)}
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Preparing…"
          >
            {workspace.latestUnsigned
              ? "Regenerate application"
              : "Generate application"}
          </PendingSubmitButton>
        </form>
      ) : null}
      {workspace.latestUnsigned ? (
        <form action={uploadSignedPackAction} className="space-y-3">
          <input type="hidden" name="order_id" value={workspace.order.id} />
          {queueFields(remaining)}
          <div>
            <label
              htmlFor={`signed-pack-${workspace.order.id}`}
              className="block text-sm text-ink"
            >
              Completed / signed PDF
            </label>
            <input
              id={`signed-pack-${workspace.order.id}`}
              name="signed_pack"
              type="file"
              accept="application/pdf"
              required
              className={fieldClassName}
            />
          </div>
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Uploading…"
          >
            Upload signed pack
          </PendingSubmitButton>
        </form>
      ) : null}
      {workspace.latestSignedPack ? (
        <form action={recordFqSubmissionAction} className="space-y-3">
          <input type="hidden" name="order_id" value={workspace.order.id} />
          {queueFields(remaining)}
          <div>
            <label
              htmlFor={`fq-method-${workspace.order.id}`}
              className="block text-sm text-ink"
            >
              Submission method
            </label>
            <input
              id={`fq-method-${workspace.order.id}`}
              name="submission_method"
              defaultValue={workspace.application?.submission_method ?? "Manual"}
              className={fieldClassName}
            />
          </div>
          <div>
            <label
              htmlFor={`fq-ref-${workspace.order.id}`}
              className="block text-sm text-ink"
            >
              Fisheries Queensland reference
            </label>
            <input
              id={`fq-ref-${workspace.order.id}`}
              name="fq_reference"
              defaultValue={workspace.application?.fq_reference ?? ""}
              className={fieldClassName}
            />
          </div>
          <div>
            <label
              htmlFor={`fq-notes-${workspace.order.id}`}
              className="block text-sm text-ink"
            >
              Notes
            </label>
            <input
              id={`fq-notes-${workspace.order.id}`}
              name="notes"
              defaultValue={workspace.application?.notes ?? ""}
              className={fieldClassName}
            />
          </div>
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Recording…"
          >
            Record FQ submission
          </PendingSubmitButton>
        </form>
      ) : null}
      {status === "SUBMITTED" ? (
        <form action={recordTransferProcessingAction}>
          <input type="hidden" name="order_id" value={workspace.order.id} />
          {queueFields(remaining)}
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Updating…"
          >
            Mark processing
          </PendingSubmitButton>
        </form>
      ) : null}
      {status === "SUBMITTED" || status === "PROCESSING" ? (
        <form action={approveQldTransferAction}>
          <input type="hidden" name="order_id" value={workspace.order.id} />
          {queueFields(remaining)}
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Approving…"
          >
            Mark FQ approved
          </PendingSubmitButton>
        </form>
      ) : null}
      {status !== "APPROVED" && status !== "READY" ? (
        <form action={recordTransferActionRequiredAction} className="space-y-3">
          <input type="hidden" name="order_id" value={workspace.order.id} />
          {queueFields(remaining)}
          <div>
            <label
              htmlFor={`action-notes-${workspace.order.id}`}
              className="block text-sm text-ink"
            >
              Return for correction (note)
            </label>
            <input
              id={`action-notes-${workspace.order.id}`}
              name="notes"
              className={fieldClassName}
            />
          </div>
          <PendingSubmitButton
            className={tableButtonClassName}
            pendingLabel="Updating…"
          >
            Action required
          </PendingSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
