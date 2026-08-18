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

      const transferGroup = `order_${input.orderId}`;
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        customer_email: input.buyerEmail,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
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

      let session: Stripe.Checkout.Session;

      try {
        session = await stripe.checkout.sessions.create({
          ...sessionParams,
          payment_method_types: ["card", "au_becs_debit"],
        });
      } catch {
        session = await stripe.checkout.sessions.create({
          ...sessionParams,
          payment_method_types: ["card"],
        });
      }

      if (!session.url) {
        throw new Error("Stripe did not return a Checkout URL.");
      }

      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      return {
        url: session.url,
        checkoutSessionId: session.id,
        paymentIntentId: paymentIntent,
      };
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
