"use server";

import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import { getMyRole, getOrganisation } from "@/lib/organisations/queries";
import { getPaymentProvider } from "@/lib/payments/provider";
import {
  getOrderSellerPaymentAccount,
  getOrganisationPaymentStatus,
  getPaymentForOrder,
} from "@/lib/payments/queries";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrder } from "@/lib/orders/queries";
import { listingOfferingLabel } from "@/lib/listings/types";
import { getSiteUrl } from "@/lib/site-url";
import { orderChargeAud } from "@/lib/payments/money";

export type PaymentFormState = {
  error?: string;
};

export async function createAccountSessionAction(
  organisationId: number,
): Promise<{ clientSecret?: string; error?: string }> {
  const user = await getUser();
  const provider = getPaymentProvider();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return { error: "You must be signed in." };
  }

  if (!provider) {
    return { error: "Payments are not configured." };
  }

  const role = await getMyRole(organisationId);

  if (!role || !canEditOrganisation(role)) {
    return { error: "You cannot connect payments for that account." };
  }

  const result = await getOrganisation(organisationId);

  if (!result) {
    return { error: "Account not found." };
  }

  const status = await getOrganisationPaymentStatus(organisationId);
  let accountId = status?.accountId ?? null;

  try {
    if (!accountId) {
      accountId = await provider.createConnectedAccount({
        organisationId,
        legalName: result.organisation.legal_name,
        email: user.email,
      });

      const { error } = await supabase.rpc("attach_organisation_stripe_account", {
        p_organisation_id: organisationId,
        p_account_id: accountId,
      });

      if (error) {
        return { error: error.message };
      }
    }

    try {
      return { clientSecret: await provider.createAccountSession(accountId) };
    } catch (sessionError) {
      if (status?.chargesEnabled) {
        throw sessionError;
      }

      accountId = await provider.createConnectedAccount({
        organisationId,
        legalName: result.organisation.legal_name,
        email: user.email,
      });

      const { error } = await supabase.rpc("attach_organisation_stripe_account", {
        p_organisation_id: organisationId,
        p_account_id: accountId,
      });

      if (error) {
        return { error: error.message };
      }

      return { clientSecret: await provider.createAccountSession(accountId) };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start Stripe onboarding.";
    return { error: message };
  }
}

export async function startOrderCheckoutAction(
  orderId: number,
): Promise<PaymentFormState> {
  const user = await getUser();
  const provider = getPaymentProvider();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return { error: "You must be signed in." };
  }

  if (!provider) {
    return { error: "Payments are not configured." };
  }

  const order = await getOrder(orderId);

  if (!order) {
    return { error: "Order not found." };
  }

  if (order.status !== "AWAITING_PAYMENT") {
    return { error: "This order is not waiting for payment." };
  }

  const seller = await getOrderSellerPaymentAccount(order.id);

  if (!seller?.accountId || !seller.chargesEnabled) {
    return { error: "This seller cannot accept payments yet." };
  }

  const siteUrl = await getSiteUrl();

  if (!siteUrl) {
    return { error: "Could not build the payment return URL." };
  }

  const checkout = await provider.createCheckout({
    orderId: order.id,
    fisheryName: order.fishery_name,
    offeringLabel: listingOfferingLabel(order.offering),
    amountAud: order.amount_aud,
    feeAmountAud: order.fee_amount_aud,
    buyerEmail: user.email,
    successUrl: `${siteUrl}/orders/${order.id}?paid=1`,
    cancelUrl: `${siteUrl}/orders/${order.id}?pay=cancelled`,
  });

  const { error } = await supabase.rpc("upsert_order_payment", {
    p_order_id: order.id,
    p_checkout_session_id: checkout.checkoutSessionId,
    p_payment_intent_id: checkout.paymentIntentId,
    p_amount_aud: orderChargeAud(order.amount_aud, order.fee_amount_aud),
    p_fee_amount_aud: Number(order.fee_amount_aud),
  });

  if (error) {
    return { error: error.message };
  }

  redirect(checkout.url);
}

export async function transferOrderSellerProceeds(
  orderId: number,
): Promise<{ error?: string }> {
  const provider = getPaymentProvider();

  if (!provider) {
    return {};
  }

  const order = await getOrder(orderId);
  const payment = await getPaymentForOrder(orderId);

  if (!order) {
    return { error: "Order not found." };
  }

  if (!payment) {
    return {};
  }

  if (payment.status !== "PAID") {
    return { error: "This order has not been paid." };
  }

  if (payment.stripe_transfer_id) {
    return {};
  }

  const seller = await getOrderSellerPaymentAccount(order.id);

  if (!seller?.accountId) {
    return { error: "This seller does not have a Stripe account." };
  }

  const service = createServiceClient();

  if (!service) {
    return { error: "Could not record the seller transfer." };
  }

  try {
    const transferId = await provider.transferSellerProceeds({
      orderId: order.id,
      amountAud: order.amount_aud,
      sellerAccountId: seller.accountId,
      paymentIntentId: payment.payment_intent_id
        ? String(payment.payment_intent_id)
        : null,
    });

    if (!transferId) {
      return {};
    }

    const { error } = await service.rpc("attach_order_seller_transfer", {
      p_order_id: order.id,
      p_transfer_id: transferId,
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Seller transfer failed.";
    return { error: message };
  }
}
