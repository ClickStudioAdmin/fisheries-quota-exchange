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
      "If I do not proceed after a buyer has committed, I must still pay FQX that platform commission.",
  },
  {
    name: "ack_seller_terms",
    label: "I have read and agree to the seller terms of service.",
  },
] as const;

export const BUYER_PURCHASE_ACKNOWLEDGEMENTS = [
  {
    name: "ack_buyer_binding",
    label:
      "Purchase Now is a binding agreement to complete this trade. Quota is reserved immediately.",
  },
  {
    name: "ack_buyer_pay",
    label:
      "I will pay FQX the listed amount, plus Stripe card processing if I pay by Australian-issued card.",
  },
  {
    name: "ack_buyer_server",
    label:
      "I will not treat the browser, a return URL, or unpaid checkout as proof that the trade is finished.",
  },
  {
    name: "ack_buyer_commission_abort",
    label:
      "If I do not proceed, I must still pay FQX the platform commission that would have applied to this trade.",
  },
  {
    name: "ack_buyer_terms",
    label: "I have read and agree to the buyer terms of service.",
  },
] as const;

export const BUYER_BID_ACKNOWLEDGEMENTS = [
  {
    name: "ack_bid_server_time",
    label: "Bid time is recorded by the server, not my browser.",
  },
  {
    name: "ack_bid_binding",
    label:
      "If I win (at or above reserve), I enter a binding agreement to complete the trade, quota is reserved, and I must pay FQX.",
  },
  {
    name: "ack_bid_commission_abort",
    label:
      "If I do not proceed after winning, I must still pay FQX the platform commission that would have applied to this trade.",
  },
  {
    name: "ack_bid_terms",
    label: "I have read and agree to the buyer terms of service.",
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
