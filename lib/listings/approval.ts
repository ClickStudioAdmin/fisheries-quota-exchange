import { tradeRequiresQldProfile } from "@/lib/organisations/completeness";
import {
  getFishery,
  getHolding,
  getQldJurisdictionId,
  listHoldingCommitments,
  listJurisdictions,
} from "@/lib/fisheries/queries";
import {
  holdingVerificationLabel,
  type Fishery,
  type Jurisdiction,
  type QuotaHolding,
} from "@/lib/fisheries/types";
import { getListing } from "@/lib/listings/queries";
import { listingApprovalChecks } from "@/lib/listings/approval-checks";
import type { Listing } from "@/lib/listings/types";
import {
  getOrganisationForAdmin,
  getOrganisationJurisdictionProfile,
  getOrganisationLegalName,
} from "@/lib/organisations/queries";
import type {
  Organisation,
  OrganisationJurisdictionProfile,
} from "@/lib/organisations/types";

export type ListingApprovalWorkspace = {
  listing: Listing;
  holding: QuotaHolding | null;
  holdingStatusLabel: string;
  fishery: Fishery | null;
  jurisdiction: Jurisdiction | null;
  organisation: Organisation | null;
  organisationName: string;
  qldProfile: OrganisationJurisdictionProfile | null;
  listed: number;
  available: number;
  checks: readonly string[];
};

export async function getListingApprovalWorkspace(
  listingId: number,
): Promise<ListingApprovalWorkspace | null> {
  const listing = await getListing(listingId);

  if (!listing) {
    return null;
  }

  const holding = await getHolding(listing.holding_id);
  const [
    fishery,
    jurisdictions,
    organisation,
    organisationName,
    commitments,
  ] = await Promise.all([
    holding ? getFishery(holding.fishery_id) : Promise.resolve(null),
    listJurisdictions(),
    getOrganisationForAdmin(listing.organisation_id),
    getOrganisationLegalName(listing.organisation_id),
    holding
      ? listHoldingCommitments([holding.id])
      : Promise.resolve(new Map<number, number>()),
  ]);
  const jurisdiction =
    jurisdictions.find((item) => item.id === fishery?.jurisdiction_id) ?? null;
  const qld = tradeRequiresQldProfile(jurisdiction?.code);
  const qldId = qld ? await getQldJurisdictionId() : null;
  const qldProfile =
    qld && qldId
      ? await getOrganisationJurisdictionProfile(
          listing.organisation_id,
          qldId,
        )
      : null;
  const listed = holding ? (commitments.get(holding.id) ?? 0) : 0;

  return {
    listing,
    holding,
    holdingStatusLabel: holding
      ? holdingVerificationLabel(holding.verification_status)
      : "—",
    fishery,
    jurisdiction,
    organisation,
    organisationName:
      organisation?.legal_name ??
      organisationName ??
      listing.seller_name ??
      "Business",
    qldProfile,
    listed,
    available: holding ? Number(holding.quantity) - listed : 0,
    checks: listingApprovalChecks(jurisdiction?.code, listing.listing_type),
  };
}
