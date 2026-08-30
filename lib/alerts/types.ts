import type { ListingOffering } from "@/lib/listings/types";

export type ListingAlert = {
  fishery_id: number;
  sales: boolean;
  leases: boolean;
};

export function listingAlertMatches(
  alert: Pick<ListingAlert, "sales" | "leases">,
  offering: ListingOffering,
) {
  return offering === "LEASE" ? alert.leases : alert.sales;
}

export function parseFisheryIds(values: FormDataEntryValue[]) {
  return [
    ...new Set(
      values
        .map((value) => Number(value))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
}
