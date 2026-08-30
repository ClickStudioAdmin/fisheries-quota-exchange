import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { getPaymentProvider } from "@/lib/payments/provider";
import { getOrderForSystem } from "@/lib/orders/queries";
import { revalidateOrderSurfaces } from "@/lib/orders/revalidate";
import {
  notifyBankDebitSubmitted,
  notifyCheckoutExpired,
  notifyPaymentFailed,
  notifyPaymentReceived,
  notifyPaymentsSetupComplete,
} from "@/lib/email/events";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function orderIdFrom(data: Record<string, unknown>) {
  const metadata = asRecord(data.metadata);
  const fromMeta = asString(metadata?.order_id);
  const parsed = Number(fromMeta);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function paymentIntentIdFrom(data: Record<string, unknown>) {
  return asString(data.payment_intent) ?? asString(asRecord(data.payment_intent)?.id);
}

async function markPaid(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  input: {
    orderId: number;
    checkoutSessionId?: string | null;
    paymentIntentId?: string | null;
  },
) {
  const { error } = await supabase.rpc("mark_order_paid", {
    p_order_id: input.orderId,
    p_checkout_session_id: input.checkoutSessionId ?? null,
    p_payment_intent_id: input.paymentIntentId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function handleStripeWebhook(payload: string, signature: string) {
  const provider = getPaymentProvider();
  const supabase = createServiceClient();

  if (!provider || !supabase) {
    throw new Error("Stripe webhook is not configured.");
  }

  const event = await provider.parseWebhook(payload, signature);
  const data = event.data;

  if (event.type === "account.updated") {
    const accountId = asString(data.id);

    if (accountId) {
      const { error } = await supabase.rpc("sync_organisation_stripe_status", {
        p_account_id: accountId,
        p_charges_enabled: Boolean(data.charges_enabled),
        p_payouts_enabled: Boolean(data.payouts_enabled),
        p_details_submitted: Boolean(data.details_submitted),
      });

      if (error) {
        throw new Error(error.message);
      }

      if (Boolean(data.charges_enabled)) {
        const { data: organisation } = await supabase
          .from("organisations")
          .select("id, legal_name")
          .eq("stripe_account_id", accountId)
          .maybeSingle();

        if (organisation) {
          await notifyPaymentsSetupComplete(
            Number(organisation.id),
            String(organisation.legal_name ?? "your business"),
          );
        }
      }
    }
  } else {
    const orderId = orderIdFrom(data);

    if (orderId && event.type === "checkout.session.completed") {
      if (asString(data.payment_status) !== "unpaid") {
        await markPaid(supabase, {
          orderId,
          checkoutSessionId: asString(data.id),
          paymentIntentId: paymentIntentIdFrom(data),
        });
        const order = await getOrderForSystem(orderId);
        if (order) {
          await notifyPaymentReceived(order);
        }
      } else {
        const order = await getOrderForSystem(orderId);
        if (order) {
          await notifyBankDebitSubmitted(order);
        }
      }
    } else if (
      orderId &&
      (event.type === "checkout.session.async_payment_succeeded" ||
        event.type === "payment_intent.succeeded")
    ) {
      await markPaid(supabase, {
        orderId,
        checkoutSessionId:
          event.type === "payment_intent.succeeded" ? null : asString(data.id),
        paymentIntentId:
          event.type === "payment_intent.succeeded"
            ? asString(data.id)
            : paymentIntentIdFrom(data),
      });
      const order = await getOrderForSystem(orderId);
      if (order) {
        await notifyPaymentReceived(order);
      }
    } else if (orderId && event.type === "checkout.session.async_payment_failed") {
      const order = await getOrderForSystem(orderId);
      const { error } = await supabase.rpc("fail_unpaid_order", {
        p_order_id: orderId,
        p_payment_status: "FAILED",
      });

      if (error) {
        throw new Error(error.message);
      }

      if (order) {
        await notifyPaymentFailed(order);
      }
    } else if (orderId && event.type === "checkout.session.expired") {
      const order = await getOrderForSystem(orderId);
      const { error } = await supabase.rpc("fail_unpaid_order", {
        p_order_id: orderId,
        p_payment_status: "EXPIRED",
      });

      if (error) {
        throw new Error(error.message);
      }

      if (order) {
        await notifyCheckoutExpired(order);
      }
    }

    if (orderId) {
      revalidateOrderSurfaces(orderId);
    }
  }

  const { data: isNew, error: eventError } = await supabase.rpc(
    "record_stripe_webhook_event",
    {
      p_event_id: event.id,
      p_event_type: event.type,
    },
  );

  if (eventError) {
    throw new Error(eventError.message);
  }

  return { duplicate: isNew === false };
}
