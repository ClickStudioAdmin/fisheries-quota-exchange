import { listMyOrganisations } from "@/lib/organisations/queries";

export const BUSINESS_DETAILS_REQUIRED_MESSAGE =
  "Add your business details on Account Settings before you can buy or list quota.";

export async function requireBusinessAccountError() {
  const organisations = await listMyOrganisations();

  if (organisations.length > 0) {
    return null;
  }

  return BUSINESS_DETAILS_REQUIRED_MESSAGE;
}
