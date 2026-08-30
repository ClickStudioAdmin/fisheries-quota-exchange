import { tradeRequiresQldProfile } from "@/lib/organisations/completeness";
import {
  getFishery,
  getQldJurisdictionId,
  listHoldingCommitments,
  listJurisdictions,
  listLedger,
  getHolding,
} from "@/lib/fisheries/queries";
import type {
  Fishery,
  Jurisdiction,
  QuotaHolding,
  QuotaLedgerEntry,
} from "@/lib/fisheries/types";
import {
  getOrganisationForAdmin,
  getOrganisationJurisdictionProfile,
  getOrganisationLegalName,
} from "@/lib/organisations/queries";
import type {
  Organisation,
  OrganisationJurisdictionProfile,
} from "@/lib/organisations/types";
import { holdingVerificationChecks } from "@/lib/fisheries/verification-checks";

export { holdingVerificationChecks };

export type HoldingVerificationWorkspace = {
  holding: QuotaHolding;
  fishery: Fishery | null;
  jurisdiction: Jurisdiction | null;
  organisation: Organisation | null;
  organisationName: string;
  qldProfile: OrganisationJurisdictionProfile | null;
  listed: number;
  available: number;
  ledger: QuotaLedgerEntry[];
  checks: readonly string[];
};

export async function getHoldingVerificationWorkspace(
  holdingId: number,
): Promise<HoldingVerificationWorkspace | null> {
  const holding = await getHolding(holdingId);

  if (!holding) {
    return null;
  }

  const [
    fishery,
    jurisdictions,
    organisation,
    organisationName,
    commitments,
    ledger,
  ] = await Promise.all([
    getFishery(holding.fishery_id),
    listJurisdictions(),
    getOrganisationForAdmin(holding.organisation_id),
    getOrganisationLegalName(holding.organisation_id),
    listHoldingCommitments([holding.id]),
    listLedger(holding.id),
  ]);
  const jurisdiction =
    jurisdictions.find((item) => item.id === fishery?.jurisdiction_id) ?? null;
  const qld = tradeRequiresQldProfile(jurisdiction?.code);
  const qldId = qld ? await getQldJurisdictionId() : null;
  const qldProfile =
    qld && qldId
      ? await getOrganisationJurisdictionProfile(
          holding.organisation_id,
          qldId,
        )
      : null;
  const listed = commitments.get(holding.id) ?? 0;

  return {
    holding,
    fishery,
    jurisdiction,
    organisation,
    organisationName:
      organisation?.legal_name ?? organisationName ?? "Business",
    qldProfile,
    listed,
    available: Number(holding.quantity) - listed,
    ledger,
    checks: holdingVerificationChecks(jurisdiction?.code, holding.custody_kind),
  };
}
