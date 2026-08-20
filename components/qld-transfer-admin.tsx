import {
  fieldClassName,
  tableButtonClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { LabeledFields, panelClassName } from "@/components/surface";
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import { qldTransferPublicStatusLabel } from "@/lib/orders/types";
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
  const order = workspace.order;
  const status = workspace.application?.status ?? "READY";
  const complete =
    workspace.buyerMissing.length === 0 && workspace.sellerMissing.length === 0;
  const canGenerate =
    complete &&
    status !== "SUBMITTED" &&
    status !== "PROCESSING" &&
    status !== "APPROVED";
  const formMeta = workspace.process.formType
    ? `${workspace.process.formType} ${workspace.process.formVersion}`
    : null;
  const fishery = workspace.jurisdictionCode
    ? `${workspace.jurisdictionCode} · ${order.fishery_name}`
    : order.fishery_name;

  return (
    <div className="mt-2 min-w-0 space-y-6">
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Order</h3>
          <div className="mt-4">
            <LabeledFields
              items={[
                { label: "Order", value: String(order.id) },
                { label: "Buyer", value: order.buyer_name },
                { label: "Seller", value: order.seller_name },
                {
                  label: "Offering",
                  value: listingOfferingLabel(order.offering),
                },
                { label: "Fishery", value: fishery },
                { label: "Quota type", value: order.quota_type_name },
                {
                  label: "Quantity",
                  value: `${order.quantity} ${order.unit_label}`,
                },
                { label: "Amount", value: formatAud(order.amount_aud) },
              ]}
            />
          </div>
        </section>
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Application</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {workspace.process.title}
            {formMeta ? ` · ${formMeta}` : null}
          </p>
          <div className="mt-3">
            <StatusBadge label={qldTransferPublicStatusLabel(status)} />
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            {transferApplicationStatusLabel(status)}
          </p>
          <div className="mt-4">
            <LabeledFields
              items={[
                {
                  label: "Seller details",
                  value:
                    workspace.sellerMissing.length === 0
                      ? "Complete"
                      : `Missing ${transferProfileFieldLabels(workspace.sellerMissing).join(", ")}`,
                },
                {
                  label: "Buyer details",
                  value:
                    workspace.buyerMissing.length === 0
                      ? "Complete"
                      : `Missing ${transferProfileFieldLabels(workspace.buyerMissing).join(", ")}`,
                },
                {
                  label: "Unsigned PDF",
                  value: workspace.latestUnsigned
                    ? "Generated"
                    : "Not generated",
                },
                {
                  label: "Signed pack",
                  value: workspace.latestSignedPack
                    ? "Uploaded"
                    : "Not uploaded",
                },
              ]}
            />
          </div>
        </section>
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Documents</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Generate the unsigned application from stored business details.
            Parties sign and witness it offline.
          </p>
          {workspace.latestUnsigned || workspace.latestSignedPack ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {workspace.latestUnsigned ? (
                <a
                  href={transferDocumentPath(
                    workspace.order.id,
                    workspace.latestUnsigned.id,
                  )}
                  className={tableSecondaryButtonClassName}
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
                  className={tableSecondaryButtonClassName}
                >
                  Download signed pack
                </a>
              ) : null}
            </div>
          ) : null}
          {canGenerate ? (
            <form action={generateTransferDocumentAdminAction} className="mt-4">
              <input type="hidden" name="order_id" value={order.id} />
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
        </section>
        {workspace.latestUnsigned ? (
          <section className={panelClassName}>
            <h3 className="text-lg font-semibold text-ink">Signed pack</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Upload the completed, witnessed PDF. This does not overwrite the
            unsigned application.
          </p>
          <form action={uploadSignedPackAction} className="mt-4 space-y-3">
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
        </section>
      ) : null}
      {workspace.latestSignedPack ? (
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">
            Fisheries Queensland
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Record the offline submission. There is no Fisheries Queensland API
            in this phase.
          </p>
          <form action={recordFqSubmissionAction} className="mt-4 space-y-3">
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
                defaultValue={
                  workspace.application?.submission_method ?? "Manual"
                }
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
              <textarea
                id={`fq-notes-${workspace.order.id}`}
                name="notes"
                rows={3}
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
          {status === "SUBMITTED" || status === "PROCESSING" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {status === "SUBMITTED" ? (
                <form action={recordTransferProcessingAction}>
                  <input
                    type="hidden"
                    name="order_id"
                    value={workspace.order.id}
                  />
                  {queueFields(remaining)}
                  <PendingSubmitButton
                    className={tableButtonClassName}
                    pendingLabel="Updating…"
                  >
                    Mark processing
                  </PendingSubmitButton>
                </form>
              ) : null}
              <form action={approveQldTransferAction}>
                <input
                  type="hidden"
                  name="order_id"
                  value={workspace.order.id}
                />
                {queueFields(remaining)}
                <PendingSubmitButton
                  className={tableButtonClassName}
                  pendingLabel="Approving…"
                >
                  Mark FQ approved
                </PendingSubmitButton>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}
      {status !== "APPROVED" && status !== "READY" ? (
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Return for correction</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Sends the application back so parties can update details and FQX can
            generate a new unsigned PDF. Previous files stay.
          </p>
          <form
            action={recordTransferActionRequiredAction}
            className="mt-4 space-y-3"
          >
            <input type="hidden" name="order_id" value={workspace.order.id} />
            {queueFields(remaining)}
            <div>
              <label
                htmlFor={`action-notes-${workspace.order.id}`}
                className="block text-sm text-ink"
              >
                Note
              </label>
              <textarea
                id={`action-notes-${workspace.order.id}`}
                name="notes"
                rows={3}
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
        </section>
      ) : null}
    </div>
  );
}
