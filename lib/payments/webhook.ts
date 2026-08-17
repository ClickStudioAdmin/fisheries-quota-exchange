import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { getPaymentProvider } from "@/lib/payments/provider";

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
    }
  } else {
    const orderId = orderIdFrom(data);

    if (orderId && event.type === "checkout.session.completed") {
      if (asString(data.payment_status) !== "unpaid") {
        const paymentIntent =
          asString(data.payment_intent) ??
          asString(asRecord(data.payment_intent)?.id);
        const { error } = await supabase.rpc("mark_order_paid", {
          p_order_id: orderId,
          p_checkout_session_id: asString(data.id),
          p_payment_intent_id: paymentIntent,
        });

        if (error) {
          throw new Error(error.message);
        }
      }
    } else if (orderId && event.type === "checkout.session.expired") {
      const { error } = await supabase.rpc("fail_unpaid_order", {
        p_order_id: orderId,
        p_payment_status: "EXPIRED",
      });

      if (error) {
        throw new Error(error.message);
      }
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
