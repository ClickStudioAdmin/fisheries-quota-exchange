export type OrganisationPaymentStatus = {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export type CreateCheckoutInput = {
  orderId: number;
  fisheryName: string;
  offeringLabel: string;
  amountAud: string;
  feeAmountAud: string;
  sellerAccountId: string;
  buyerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutResult = {
  url: string;
  checkoutSessionId: string;
  paymentIntentId: string | null;
};

export type PaymentProvider = {
  createConnectedAccount(input: {
    organisationId: number;
    legalName: string;
    email: string;
  }): Promise<string>;
  createAccountSession(accountId: string): Promise<string>;
  getConnectedAccountStatus(accountId: string): Promise<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  }>;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  parseWebhook(
    payload: string,
    signature: string,
  ): Promise<{
    id: string;
    type: string;
    data: Record<string, unknown>;
  }>;
};
