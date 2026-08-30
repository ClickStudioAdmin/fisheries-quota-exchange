import {
  formatMissingTradeReadyMessage,
  missingTradeReadyFields,
  tradeReadyFieldLabels,
  type TradeReadyField,
} from "@/lib/organisations/completeness";
import { getQldJurisdictionId } from "@/lib/fisheries/queries";
import {
  getOrganisation,
  getOrganisationJurisdictionProfile,
} from "@/lib/organisations/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  Organisation,
  OrganisationJurisdictionProfile,
} from "@/lib/organisations/types";

export const BUSINESS_DETAILS_REQUIRED_MESSAGE =
  "Add your business details on Business Settings before you can buy or list quota.";

export const SELLER_TRADE_DETAILS_INCOMPLETE_MESSAGE =
  "This seller has not completed business details, so this listing is not available yet.";

function tradeErrorForOrganisation(
  organisation: Organisation,
  qldProfile: OrganisationJurisdictionProfile | null,
  requireQldProfile: boolean,
) {
  const missing = missingTradeReadyFields({
    organisation,
    qldProfile,
    requireQldProfile,
  });

  if (missing.length === 0) {
    return null;
  }

  return formatMissingTradeReadyMessage(missing);
}

async function ownQldProfile(organisationId: number) {
  const qldId = await getQldJurisdictionId();

  if (!qldId) {
    return null;
  }

  return getOrganisationJurisdictionProfile(organisationId, qldId);
}

export async function requireTradeReadyError(
  organisationId: number,
  options?: { requireQldProfile?: boolean },
) {
  const loaded = await getOrganisation(organisationId);

  if (!loaded) {
    return BUSINESS_DETAILS_REQUIRED_MESSAGE;
  }

  const requireQldProfile = Boolean(options?.requireQldProfile);
  const qldProfile = requireQldProfile
    ? await ownQldProfile(loaded.organisation.id)
    : null;

  return tradeErrorForOrganisation(
    loaded.organisation,
    qldProfile,
    requireQldProfile,
  );
}

export async function requireCounterpartyTradeReadyError(
  organisationId: number,
  options?: { requireQldProfile?: boolean },
) {
  const supabase = await createClient();

  if (!supabase) {
    return SELLER_TRADE_DETAILS_INCOMPLETE_MESSAGE;
  }

  const { data, error } = await supabase.rpc("organisation_is_trade_ready", {
    p_organisation_id: organisationId,
    p_require_qld: Boolean(options?.requireQldProfile),
  });

  if (error || data !== true) {
    return SELLER_TRADE_DETAILS_INCOMPLETE_MESSAGE;
  }

  return null;
}

export async function ownMissingTradeReadyFields(
  organisationId: number,
  options?: { requireQldProfile?: boolean },
): Promise<TradeReadyField[]> {
  const loaded = await getOrganisation(organisationId);

  if (!loaded) {
    return [];
  }

  const requireQldProfile = Boolean(options?.requireQldProfile);
  const qldProfile = requireQldProfile
    ? await ownQldProfile(loaded.organisation.id)
    : null;

  return missingTradeReadyFields({
    organisation: loaded.organisation,
    qldProfile,
    requireQldProfile,
  });
}

export function ownMissingTradeReadyLabels(fields: TradeReadyField[]) {
  return tradeReadyFieldLabels(fields);
}
