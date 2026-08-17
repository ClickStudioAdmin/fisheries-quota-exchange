import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPaymentProvider } from "@/lib/payments/provider";
import type { OrganisationPaymentStatus } from "@/lib/payments/types";

export async function organisationAcceptsCardPayments(organisationId: number) {
  const supabase = await createClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc(
    "organisation_accepts_card_payments",
    { p_organisation_id: organisationId },
  );

  return !error && data === true;
}

export async function getOrganisationPaymentStatus(
  organisationId: number,
): Promise<OrganisationPaymentStatus | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("organisations")
    .select(
      "stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted",
    )
    .eq("id", organisationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    accountId: data.stripe_account_id ? String(data.stripe_account_id) : null,
    chargesEnabled: Boolean(data.stripe_charges_enabled),
    payoutsEnabled: Boolean(data.stripe_payouts_enabled),
    detailsSubmitted: Boolean(data.stripe_details_submitted),
  };
}

export async function refreshOrganisationPaymentStatus(
  organisationId: number,
): Promise<OrganisationPaymentStatus | null> {
  const status = await getOrganisationPaymentStatus(organisationId);
  const provider = getPaymentProvider();
  const service = createServiceClient();

  if (!status?.accountId || !provider || !service) {
    return status;
  }

  try {
    const live = await provider.getConnectedAccountStatus(status.accountId);
    const { error } = await service.rpc("sync_organisation_stripe_status", {
      p_account_id: status.accountId,
      p_charges_enabled: live.chargesEnabled,
      p_payouts_enabled: live.payoutsEnabled,
      p_details_submitted: live.detailsSubmitted,
    });

    if (error) {
      return status;
    }

    return {
      accountId: status.accountId,
      chargesEnabled: live.chargesEnabled,
      payoutsEnabled: live.payoutsEnabled,
      detailsSubmitted: live.detailsSubmitted,
    };
  } catch {
    return status;
  }
}

export async function getOrderSellerPaymentAccount(orderId: number) {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("order_seller_payment_account", {
    p_order_id: orderId,
  });

  if (error || !data) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as { account_id?: string | null; charges_enabled?: boolean };

  if (!record.account_id) {
    return null;
  }

  return {
    accountId: String(record.account_id),
    chargesEnabled: Boolean(record.charges_enabled),
  };
}

export async function getPaymentForOrder(orderId: number) {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, order_id, provider, checkout_session_id, payment_intent_id, status, amount_aud, fee_amount_aud, currency, created_at",
    )
    .eq("order_id", orderId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
