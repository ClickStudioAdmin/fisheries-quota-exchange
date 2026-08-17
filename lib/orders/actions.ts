"use server";

import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient, getUser } from "@/lib/supabase/server";
import type { OrderFormState } from "@/lib/orders/types";
import { sendSettledOrderInvoice } from "@/lib/orders/settlement-mail";

function read(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createOrderAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user || !supabase) {
    return { error: "You must be signed in." };
  }

  const listingId = Number(formData.get("listing_id"));
  const buyerOrganisationId = Number(formData.get("buyer_organisation_id"));

  if (!Number.isInteger(listingId) || !Number.isInteger(buyerOrganisationId)) {
    return { error: "Choose an organisation to buy with." };
  }

  const { data, error } = await supabase.rpc("create_order", {
    p_listing_id: listingId,
    p_buyer_organisation_id: buyerOrganisationId,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/orders/${data}`);
}

export async function cancelOrderAction(formData: FormData) {
  const supabase = await createClient();
  const orderId = Number(formData.get("order_id"));
  const next = read(formData, "next") || "/dashboard";

  if (!supabase || !Number.isInteger(orderId)) {
    return;
  }

  await supabase.rpc("cancel_order", { p_order_id: orderId });
  redirect(next);
}

export async function approveComplianceAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));
  const note = read(formData, "review_note");

  if (!Number.isInteger(orderId)) {
    return;
  }

  await supabase.rpc("approve_compliance", {
    p_order_id: orderId,
    p_note: note || null,
  });

  redirect("/admin/orders");
}

export async function rejectComplianceAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));
  const note = read(formData, "review_note");

  if (!Number.isInteger(orderId)) {
    return;
  }

  await supabase.rpc("reject_compliance", {
    p_order_id: orderId,
    p_note: note || null,
  });

  redirect("/admin/orders");
}

export async function simulateTransferAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));

  if (!Number.isInteger(orderId)) {
    return;
  }

  await supabase.rpc("simulate_transfer", { p_order_id: orderId });
  redirect("/admin/orders");
}

export async function simulateSettlementAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));

  if (!Number.isInteger(orderId)) {
    return;
  }

  const { error } = await supabase.rpc("simulate_settlement", {
    p_order_id: orderId,
  });

  if (!error) {
    try {
      await sendSettledOrderInvoice(orderId);
    } catch (mailError) {
      const message =
        mailError instanceof Error ? mailError.message : "Invoice email failed.";
      console.error("sendSettledOrderInvoice failed", message);
    }
  }

  redirect("/admin/orders");
}
