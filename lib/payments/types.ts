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
  buyerEmail: string;
  returnUrl: string;
  existingCheckoutSessionId?: string | null;
};

export type CreateCheckoutResult = {
  clientSecret: string;
  checkoutSessionId: string;
  paymentIntentId: string | null;
};

export type CreateSellerTransferInput = {
  orderId: number;
  amountAud: string;
  sellerAccountId: string;
  paymentIntentId: string | null;
};

export type CheckoutPaymentStatus = {
  status: string | null;
  paymentStatus: string | null;
  paymentIntentId: string | null;
  paymentIntentStatus: string | null;
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
  getCheckoutPaymentStatus(
    checkoutSessionId: string,
  ): Promise<CheckoutPaymentStatus>;
  transferSellerProceeds(input: CreateSellerTransferInput): Promise<string | null>;
  parseWebhook(
    payload: string,
    signature: string,
  ): Promise<{
    id: string;
    type: string;
    data: Record<string, unknown>;
  }>;
};
