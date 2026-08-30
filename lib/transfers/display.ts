import type { Fishery, Jurisdiction } from "@/lib/fisheries/types";
import { orderStatusLabel, type Order } from "@/lib/orders/types";
import { getTransferProcess } from "@/lib/transfers/registry";

export function transferStatusInputForOrder(
  order: Pick<Order, "offering" | "fishery_name">,
  application: {
    process_code: string;
    status: string;
    signing_channel?: string | null;
  } | null | undefined,
  fisheries: readonly Pick<Fishery, "name" | "jurisdiction_id">[],
  jurisdictions: readonly Pick<Jurisdiction, "id" | "code">[],
) {
  const fishery = fisheries.find((item) => item.name === order.fishery_name);
  const jurisdictionCode =
    jurisdictions.find((item) => item.id === fishery?.jurisdiction_id)?.code ??
    null;
  const usesSimulatedTransfer = application?.process_code
    ? application.process_code === "SIMULATED"
    : getTransferProcess(jurisdictionCode, order.offering).usesSimulatedTransfer;

  return {
    usesSimulatedTransfer,
    applicationStatus: application?.status ?? null,
    signingChannel: application?.signing_channel ?? null,
  };
}

export function orderStatusLabelFor(
  order: Pick<Order, "id" | "status" | "offering" | "fishery_name">,
  applications: ReadonlyMap<
    number,
    { process_code: string; status: string; signing_channel?: string | null }
  >,
  fisheries: readonly Pick<Fishery, "name" | "jurisdiction_id">[],
  jurisdictions: readonly Pick<Jurisdiction, "id" | "code">[],
) {
  if (order.status !== "AWAITING_TRANSFER") {
    return orderStatusLabel(order.status);
  }

  return orderStatusLabel(
    order.status,
    transferStatusInputForOrder(
      order,
      applications.get(order.id),
      fisheries,
      jurisdictions,
    ),
  );
}
