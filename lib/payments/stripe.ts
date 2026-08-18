import "server-only";

import Stripe from "stripe";
import { getStripeEnv } from "@/lib/payments/env";
import { audToCents, orderChargeAud } from "@/lib/payments/money";
import type { PaymentProvider } from "@/lib/payments/types";

function stripeClient() {
  const env = getStripeEnv();

  if (!env) {
    throw new Error("Stripe is not configured.");
  }

  return new Stripe(env.secretKey);
}

function checkoutResult(session: Stripe.Checkout.Session) {
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (!session.client_secret) {
    throw new Error("Stripe did not return a Checkout client secret.");
  }

  return {
    clientSecret: session.client_secret,
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntent,
  };
}

async function createEmbeddedCheckoutSession(
  stripe: Stripe,
  params: Stripe.Checkout.SessionCreateParams,
) {
  const attempts: Array<Pick<
    Stripe.Checkout.SessionCreateParams,
    "payment_method_types"
  > | Record<string, never>> = [
    { payment_method_types: ["card", "au_becs_debit"] },
    {},
    { payment_method_types: ["card"] },
  ];

  let lastError: unknown;

  for (const extra of attempts) {
    try {
      return await stripe.checkout.sessions.create({
        ...params,
        ...extra,
      });
    } catch (error) {
      lastError = error;
      console.error("Stripe Checkout session attempt failed", extra, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not create a Stripe Checkout session.");
}

export function createStripePaymentProvider(): PaymentProvider {
  return {
    async createConnectedAccount(input) {
      const stripe = stripeClient();
      const account = await stripe.accounts.create({
        country: "AU",
        email: input.email,
        business_profile: {
          name: input.legalName,
        },
        controller: {
          fees: { payer: "application" },
          losses: { payments: "application" },
          requirement_collection: "application",
          stripe_dashboard: { type: "none" },
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          organisation_id: String(input.organisationId),
        },
      });

      return account.id;
    },

    async createAccountSession(accountId) {
      const stripe = stripeClient();
      const account = await stripe.accounts.retrieve(accountId);
      const platformCollects =
        account.controller?.requirement_collection === "application";
      const features = platformCollects
        ? {
            disable_stripe_user_authentication: true,
            external_account_collection: true,
          }
        : undefined;
      const session = await stripe.accountSessions.create({
        account: accountId,
        components: {
          account_onboarding: {
            enabled: true,
            ...(features ? { features } : {}),
          },
          account_management: {
            enabled: true,
            ...(features ? { features } : {}),
          },
        },
      });

      if (!session.client_secret) {
        throw new Error("Stripe did not return an account session.");
      }

      return session.client_secret;
    },

    async getConnectedAccountStatus(accountId) {
      const account = await stripeClient().accounts.retrieve(accountId);

      return {
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
        detailsSubmitted: Boolean(account.details_submitted),
      };
    },

    async createCheckout(input) {
      const stripe = stripeClient();
      const totalCents = audToCents(
        orderChargeAud(input.amountAud, input.feeAmountAud),
      );

      if (totalCents < 50) {
        throw new Error("Charge must be at least $0.50.");
      }

      if (input.existingCheckoutSessionId) {
        const existing = await stripe.checkout.sessions
          .retrieve(input.existingCheckoutSessionId)
          .catch(() => null);

        if (
          existing?.status === "open" &&
          existing.ui_mode === "embedded_page" &&
          existing.client_secret
        ) {
          return checkoutResult(existing);
        }
      }

      const transferGroup = `order_${input.orderId}`;
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        ui_mode: "embedded_page",
        mode: "payment",
        customer_email: input.buyerEmail,
        return_url: input.returnUrl,
        redirect_on_completion: "if_required",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "aud",
              unit_amount: totalCents,
              product_data: {
                name: `FQX ${input.offeringLabel} — ${input.fisheryName}`,
                description: `Order ${input.orderId}`,
              },
            },
          },
        ],
        payment_intent_data: {
          transfer_group: transferGroup,
          metadata: {
            order_id: String(input.orderId),
          },
        },
        metadata: {
          order_id: String(input.orderId),
        },
      };

      const session = await createEmbeddedCheckoutSession(stripe, sessionParams);

      if (!session.client_secret) {
        throw new Error("Stripe did not return a Checkout client secret.");
      }

      return checkoutResult(session);
    },

    async transferSellerProceeds(input) {
      const stripe = stripeClient();
      const amountCents = audToCents(input.amountAud);

      if (amountCents < 1) {
        throw new Error("Transfer amount must be greater than zero.");
      }

      let sourceTransaction: string | undefined;

      if (input.paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          input.paymentIntentId,
        );

        if (paymentIntent.transfer_data?.destination) {
          return null;
        }

        const charge =
          typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id;

        if (charge) {
          sourceTransaction = charge;
        }
      }

      const transfer = await stripe.transfers.create(
        {
          amount: amountCents,
          currency: "aud",
          destination: input.sellerAccountId,
          transfer_group: `order_${input.orderId}`,
          metadata: {
            order_id: String(input.orderId),
          },
          ...(sourceTransaction
            ? { source_transaction: sourceTransaction }
            : {}),
        },
        { idempotencyKey: `fqx-order-transfer-${input.orderId}` },
      );

      return transfer.id;
    },

    async parseWebhook(payload, signature) {
      const env = getStripeEnv();

      if (!env) {
        throw new Error("Stripe is not configured.");
      }

      const event = stripeClient().webhooks.constructEvent(
        payload,
        signature,
        env.webhookSecret,
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data.object as unknown as Record<string, unknown>,
      };
    },
  };
}
