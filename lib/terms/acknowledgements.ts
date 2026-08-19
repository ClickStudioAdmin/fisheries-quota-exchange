export const ACKNOWLEDGEMENTS_REQUIRED_MESSAGE =
  "Tick every acknowledgement before you continue.";

export const SELLER_ACKNOWLEDGEMENTS = [
  {
    name: "ack_seller_entitled",
    label:
      "I am entitled to list this quota from a verified holding that I can transfer.",
  },
  {
    name: "ack_seller_binding",
    label:
      "This listing is a binding offer. If a buyer purchases, or an auction is won, I must complete the sale or lease.",
  },
  {
    name: "ack_seller_no_withdraw",
    label:
      "I will not withdraw after a buyer has committed in order to avoid the trade.",
  },
  {
    name: "ack_seller_commission_complete",
    label:
      "On a completed trade, FQX deducts the platform commission from my proceeds. The buyer does not pay that commission on top.",
  },
  {
    name: "ack_seller_commission_abort",
    label:
      "If I do not proceed after a buyer has committed, I may be liable to pay FQX that platform commission.",
  },
  {
    name: "ack_seller_terms",
    label: "I have read and agree to the seller terms of service.",
  },
] as const;

export const BUYER_PURCHASE_ACKNOWLEDGEMENTS = [
  {
    name: "ack_buyer_terms",
    label: "I have read and agree to the buyer terms of service.",
  },
] as const;

export const BUYER_BID_ACKNOWLEDGEMENTS = [
  {
    name: "ack_bid_terms",
    label: "I have read and agree to the bidder terms of service.",
  },
] as const;

export type Acknowledgement = {
  name: string;
  label: string;
};

export function acknowledgementNames(items: readonly Acknowledgement[]) {
  return items.map((item) => item.name);
}

export function missingAcknowledgements(
  formData: FormData,
  names: readonly string[],
) {
  return names.filter((name) => String(formData.get(name) ?? "") !== "on");
}

export function requireAcknowledgements(
  formData: FormData,
  items: readonly Acknowledgement[],
) {
  if (missingAcknowledgements(formData, acknowledgementNames(items)).length > 0) {
    return ACKNOWLEDGEMENTS_REQUIRED_MESSAGE;
  }

  return null;
}
