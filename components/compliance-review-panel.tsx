import { ReviewOrderForms } from "@/components/review-order-forms";
import { ReviewChecklistForm } from "@/components/review-checklist-form";
import { saveComplianceChecklistAction } from "@/lib/orders/actions";
import { checklistIsComplete } from "@/lib/orders/checklist";
import {
  LabeledFieldGroups,
  LabeledFields,
  panelClassName,
} from "@/components/surface";
import { formatAud, listingOfferingLabel } from "@/lib/listings/types";
import { formatIsoDate } from "@/lib/format";
import { formatAustralianAddress } from "@/lib/organisations/address";
import {
  entityKindLabel,
  isOrganisationRole,
  organisationRoleLabel,
} from "@/lib/organisations/types";
import { transferProfileFieldLabels } from "@/lib/transfers/profile";
import type { TransferPartyDetails } from "@/lib/transfers/application-data";
import type { TransferWorkspace } from "@/lib/transfers/queries";
import type { TransferProfileField } from "@/lib/transfers/types";

function display(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text || "—";
}

function signatoryLabel(party: TransferPartyDetails) {
  const names = party.signatories
    .map((item) => {
      const role = isOrganisationRole(item.role)
        ? organisationRoleLabel(item.role)
        : item.role;
      const name = item.full_name.trim();
      return name ? `${name} (${role})` : role;
    })
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

function PartyDetails({
  heading,
  party,
  missing,
  showQldFields,
  fallbackName,
}: {
  heading: string;
  party: TransferPartyDetails | null;
  missing: TransferProfileField[];
  showQldFields: boolean;
  fallbackName: string;
}) {
  if (!party) {
    return (
      <section className={panelClassName}>
        <h3 className="text-lg font-semibold text-ink">{heading}</h3>
        <p className="mt-3 text-sm text-ink-muted">
          {fallbackName
            ? `Listed on this order as ${fallbackName}. Full business details are not available yet.`
            : "Business details are not available yet."}
        </p>
      </section>
    );
  }

  const company = party.entity_kind === "COMPANY";
  const postal = party.postal_same_as_registered
    ? "Same as registered"
    : formatAustralianAddress(party.postal_address) || "—";

  return (
    <section className={panelClassName}>
      <h3 className="text-lg font-semibold text-ink">{heading}</h3>
      {missing.length > 0 ? (
        <p className="mt-2 text-sm text-ink-muted">
          Incomplete for transfer: {transferProfileFieldLabels(missing).join(", ")}
        </p>
      ) : null}
      <div className="mt-4">
        <LabeledFieldGroups
          groups={[
            {
              items: [
                {
                  label: "Entity",
                  value: party.entity_kind
                    ? entityKindLabel(party.entity_kind)
                    : "—",
                },
                ...(company
                  ? [{ label: "ACN", value: display(party.acn) }]
                  : []),
                ...(party.entity_kind === "INDIVIDUAL"
                  ? [
                      {
                        label: "Date of birth",
                        value: party.date_of_birth
                          ? formatIsoDate(party.date_of_birth)
                          : "—",
                      },
                    ]
                  : []),
                { label: "ABN", value: display(party.abn) },
                { label: "Legal name", value: display(party.legal_name) },
                { label: "Trading name", value: display(party.trading_name) },
                { label: "Phone", value: display(party.mobile) },
                { label: "Email", value: display(party.email) },
              ],
            },
            {
              title: "Address",
              columns: 1,
              items: [
                {
                  label: "Registered",
                  value:
                    formatAustralianAddress(party.registered_address) || "—",
                },
                { label: "Postal", value: postal },
              ],
            },
            ...(showQldFields
              ? [
                  {
                    title: "Queensland Fisheries",
                    items: [
                      {
                        label: "Client number",
                        value: display(party.profile?.client_reference),
                      },
                      {
                        label: "Commercial fishing licence",
                        value: display(party.profile?.licence_number),
                      },
                      {
                        label: "Fishery symbols",
                        value: display(party.profile?.fishery_symbols),
                      },
                    ],
                  },
                ]
              : []),
            {
              columns: 1,
              items: [
                { label: "Owners / admins", value: signatoryLabel(party) },
              ],
            },
          ]}
        />
      </div>
    </section>
  );
}

export function ComplianceReviewPanel({
  workspace,
  reviewQueue = [],
}: {
  workspace: TransferWorkspace;
  reviewQueue?: number[];
}) {
  const order = workspace.order;
  const qld = !workspace.process.usesSimulatedTransfer;
  const fishery = workspace.jurisdictionCode
    ? `${workspace.jurisdictionCode} · ${order.fishery_name}`
    : order.fishery_name;
  const incomplete =
    workspace.buyerMissing.length > 0 || workspace.sellerMissing.length > 0;

  return (
    <div className="mt-2 min-w-0 space-y-6">
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">Order</h3>
          <div className="mt-4">
            <LabeledFields
              items={[
                { label: "Order", value: String(order.id) },
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
                ...(order.unused_quantity != null &&
                order.used_quantity != null
                  ? [
                      {
                        label: "Unused / used",
                        value: `${order.unused_quantity} ${order.unit_label} / ${order.used_quantity} ${order.unit_label}`,
                      },
                    ]
                  : []),
                { label: "Amount", value: formatAud(order.amount_aud) },
                {
                  label: "Platform fee",
                  value:
                    Number(order.fee_percent) > 0
                      ? `${formatAud(order.fee_amount_aud)} (${order.fee_percent}%)`
                      : formatAud(order.fee_amount_aud),
                },
              ]}
            />
          </div>
        </section>
        <section className={panelClassName}>
          <h3 className="text-lg font-semibold text-ink">
            {qld ? "Queensland checks" : "Compliance checks"}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {workspace.process.title}
          </p>
          <div className="mt-4">
            <ReviewChecklistForm
              action={saveComplianceChecklistAction}
              hidden={{ order_id: String(order.id) }}
              checks={workspace.process.complianceChecks}
              completed={order.compliance_checklist}
              proceedGoal="to approve compliance"
            />
          </div>
        </section>
      </div>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <PartyDetails
          heading="Seller"
          party={workspace.seller}
          missing={workspace.sellerMissing}
          showQldFields={qld}
          fallbackName={order.seller_name}
        />
        <PartyDetails
          heading="Buyer"
          party={workspace.buyer}
          missing={workspace.buyerMissing}
          showQldFields={qld}
          fallbackName={order.buyer_name}
        />
      </div>
      <section id="review-decision" className={panelClassName}>
        <h3 className="text-lg font-semibold text-ink">Decision</h3>
        {qld && incomplete ? (
          <p className="mt-2 text-sm text-ink-muted">
            Missing transfer fields are listed above. They do not block this
            compliance decision. PDF generation later still requires a complete
            Queensland profile.
          </p>
        ) : null}
        <div className="mt-4">
          <ReviewOrderForms
            order={order}
            reviewQueue={reviewQueue}
            canApprove={checklistIsComplete(
              workspace.process.complianceChecks,
              order.compliance_checklist,
            )}
          />
        </div>
      </section>
    </div>
  );
}
