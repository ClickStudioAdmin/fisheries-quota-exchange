import Link from "next/link";
import { VerifyHoldingForm } from "@/components/verify-holding-form";
import { ReviewChecklistForm } from "@/components/review-checklist-form";
import { LabeledFieldGroups, LabeledFields, panelClassName } from "@/components/surface";
import { saveHoldingVerificationChecklistAction } from "@/lib/fisheries/actions";
import {
  jurisdictionLabel,
  quantityTypeLabel,
} from "@/lib/fisheries/types";
import { getHoldingVerificationWorkspace } from "@/lib/fisheries/verification";
import { formatTableDateTime } from "@/lib/format";
import { formatAustralianAddress } from "@/lib/organisations/address";
import { entityKindLabel } from "@/lib/organisations/types";
import { tradeRequiresQldProfile } from "@/lib/organisations/completeness";
import { adminHoldingPath } from "@/lib/organisations/paths";

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
  const company = organisation?.entity_kind === "COMPANY";
  const recentLedger = ledger.slice(-5).reverse();

  return (
    <div className="mt-2 space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
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
            {qld ? "Queensland checks" : "Verification checks"}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Work through these steps against the authority record. Save
            progress if you need to come back.
          </p>
          <div className="mt-4">
            <ReviewChecklistForm
              action={saveHoldingVerificationChecklistAction}
              hidden={{ holding_id: String(holding.id) }}
              checks={checks}
              completed={holding.verification_checklist}
              hint="Save as you work. Verifying still records the decision."
            />
          </div>
        </section>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
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
      <section className={panelClassName}>
        <h3 className="text-lg font-semibold text-ink">Decision</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Verifying lets this business list or auction this holding. It does
          not move quota.
        </p>
        <div className="mt-4">
          <VerifyHoldingForm
            holdingId={holding.id}
            reviewQueue={reviewQueue}
            withRequestChanges
          />
        </div>
      </section>
    </div>
  );
}
