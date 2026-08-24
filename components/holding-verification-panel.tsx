import Link from "next/link";
import { VerifyHoldingForm } from "@/components/verify-holding-form";
import { ReviewChecklistForm } from "@/components/review-checklist-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { LabeledFieldGroups, LabeledFields, panelClassName } from "@/components/surface";
import {
  cancelCustodialHoldingAction,
  saveHoldingVerificationChecklistAction,
} from "@/lib/fisheries/actions";
import {
  jurisdictionLabel,
  quantityTypeLabel,
  holdingCustodyLabel,
  holdingIsCustodial,
} from "@/lib/fisheries/types";
import { tableSecondaryButtonClassName } from "@/components/auth-card";
import { getHoldingVerificationWorkspace } from "@/lib/fisheries/verification";
import { formatIsoDate, formatTableDateTime } from "@/lib/format";
import { formatAustralianAddress } from "@/lib/organisations/address";
import { entityKindLabel } from "@/lib/organisations/types";
import { tradeRequiresQldProfile } from "@/lib/organisations/completeness";
import { adminHoldingPath } from "@/lib/organisations/paths";
import { checklistIsComplete } from "@/lib/orders/checklist";

function display(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text || "—";
}

export async function HoldingVerificationPanel({
  holdingId,
  reviewQueue = [],
}: {
  holdingId: number;
  reviewQueue?: number[];
}) {
  const workspace = await getHoldingVerificationWorkspace(holdingId);

  if (!workspace) {
    return <p className="text-sm text-ink-muted">Holding not found.</p>;
  }

  const {
    holding,
    fishery,
    jurisdiction,
    organisation,
    organisationName,
    qldProfile,
    listed,
    available,
    ledger,
    checks,
  } = workspace;
  const qld = tradeRequiresQldProfile(jurisdiction?.code);
  const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "units";
  const custodial = holdingIsCustodial(holding);
  const company = organisation?.entity_kind === "COMPANY";
  const recentLedger = ledger.slice(-5).reverse();

  return (
    <div className="mt-2 min-w-0 space-y-6">
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Holding</h3>
          <div className="mt-4">
            <LabeledFields
              items={[
                { label: "Holding", value: String(holding.id) },
                { label: "Business", value: organisationName },
                {
                  label: "Fishery",
                  value: fishery?.name ?? "—",
                },
                {
                  label: "Jurisdiction",
                  value: jurisdictionLabel(jurisdiction),
                },
                {
                  label: "Custody",
                  value: holdingCustodyLabel(holding.custody_kind),
                },
                {
                  label: "Quantity",
                  value: `${holding.quantity} ${unit}`,
                },
                {
                  label: "Listed",
                  value: `${listed} ${unit}`,
                },
                {
                  label: "Available",
                  value: `${available} ${unit}`,
                },
              ]}
            />
          </div>
          <p className="mt-4 text-sm">
            <Link
              href={adminHoldingPath(holding.id)}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open holding record
            </Link>
          </p>
        </section>
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">
            {custodial
              ? "Custodial inbound checks"
              : qld
                ? "Queensland checks"
                : "Verification checks"}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {custodial
              ? "Confirm the temporary FishNet transfer into FQX custody. FQX does not own this quota."
              : "Work through these steps against the authority record. Save progress if you need to come back."}
          </p>
          <div className="mt-4">
            <ReviewChecklistForm
              action={saveHoldingVerificationChecklistAction}
              hidden={{ holding_id: String(holding.id) }}
              checks={checks}
              completed={holding.verification_checklist}
              proceedGoal="to verify this holding"
            />
          </div>
        </section>
      </div>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Business</h3>
          {organisation ? (
            <div className="mt-4">
              <LabeledFieldGroups
                groups={[
                  {
                    items: [
                      {
                        label: "Entity",
                        value: organisation.entity_kind
                          ? entityKindLabel(organisation.entity_kind)
                          : "—",
                      },
                      ...(company
                        ? [{ label: "ACN", value: display(organisation.acn) }]
                        : []),
                      ...(organisation.entity_kind === "INDIVIDUAL"
                        ? [
                            {
                              label: "Date of birth",
                              value: organisation.date_of_birth
                                ? formatIsoDate(organisation.date_of_birth)
                                : "—",
                            },
                          ]
                        : []),
                      { label: "ABN", value: display(organisation.abn) },
                      {
                        label: "Legal name",
                        value: display(organisation.legal_name),
                      },
                      {
                        label: "Trading name",
                        value: display(organisation.trading_name),
                      },
                      { label: "Phone", value: display(organisation.mobile) },
                    ],
                  },
                  {
                    title: "Address",
                    columns: 1,
                    items: [
                      {
                        label: "Registered",
                        value:
                          formatAustralianAddress(
                            organisation.registered_address,
                          ) || "—",
                      },
                    ],
                  },
                  ...(qld
                    ? [
                        {
                          title: "Queensland Fisheries",
                          items: [
                            {
                              label: "Client number",
                              value: display(qldProfile?.client_reference),
                            },
                            {
                              label: "Commercial fishing licence",
                              value: display(qldProfile?.licence_number),
                            },
                          ],
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Business details are not available yet.
            </p>
          )}
        </section>
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Recent ledger</h3>
          {recentLedger.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No ledger rows.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-ink">
              {recentLedger.map((entry) => (
                <li key={entry.id}>
                  <span className="text-ink-muted">
                    {formatTableDateTime(entry.created_at)}
                  </span>
                  {" · "}
                  {entry.event_type}
                  {" · "}
                  {entry.quantity_after} {unit}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section id="review-decision" className={panelClassName}>
        <h3 className="text-lg font-semibold text-ink">Decision</h3>
        {custodial ? (
          <form action={cancelCustodialHoldingAction} className="mb-6 space-y-3">
            <input type="hidden" name="holding_id" value={holding.id} />
            <h4 className="text-sm font-semibold text-ink">
              Cancel pending custodial inbound
            </h4>
            <p className="text-sm text-ink-muted">
              Use when the temporary FishNet transfer never arrived. The member
              is notified.
            </p>
            <PendingSubmitButton
              className={tableSecondaryButtonClassName}
              pendingLabel="Cancelling…"
            >
              Cancel custodial request
            </PendingSubmitButton>
          </form>
        ) : null}
        <div className="mt-4">
          <VerifyHoldingForm
            holdingId={holding.id}
            reviewQueue={reviewQueue}
            withRequestChanges
            canApprove={checklistIsComplete(
              checks,
              holding.verification_checklist,
            )}
          />
        </div>
      </section>
    </div>
  );
}
