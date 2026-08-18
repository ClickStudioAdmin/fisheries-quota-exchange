"use server";

import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient, getUser } from "@/lib/supabase/server";
import { isPaymentsConfigured } from "@/lib/payments/env";
import { organisationAcceptsCardPayments } from "@/lib/payments/queries";
import { transferOrderSellerProceeds } from "@/lib/payments/actions";
import { getListing } from "@/lib/listings/queries";
import { getOrder } from "@/lib/orders/queries";
import { sendSettledOrderInvoice } from "@/lib/orders/settlement-mail";
import {
  parseOrderIds,
  type Order,
  type OrderFormState,
  type OrderStatus,
} from "@/lib/orders/types";
import { userFacingError } from "@/lib/errors/user-message";

function read(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function readOrderIds(formData: FormData) {
  return parseOrderIds(
    [
      ...formData.getAll("ids").map(String),
      String(formData.get("order_id") ?? ""),
    ].join(","),
  );
}

async function ordersForAdminAction(formData: FormData, status: OrderStatus) {
  const found = await Promise.all(readOrderIds(formData).map(getOrder));

  return found.filter(
    (order): order is Order => order != null && order.status === status,
  );
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

  const listing = await getListing(listingId);

  if (!listing) {
    return { error: "Listing not found." };
  }

  if (isPaymentsConfigured()) {
    const accepts = await organisationAcceptsCardPayments(listing.organisation_id);

    if (!accepts) {
      return {
        error:
          "This seller has not completed payment setup, so the listing cannot be purchased yet.",
      };
    }
  }

  const { data, error } = await supabase.rpc("create_order", {
    p_listing_id: listingId,
    p_buyer_organisation_id: buyerOrganisationId,
  });

  if (error) {
    return { error: userFacingError(error) };
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

  const note = read(formData, "review_note");
  const orders = await ordersForAdminAction(formData, "AWAITING_COMPLIANCE");

  for (const order of orders) {
    await supabase.rpc("approve_compliance", {
      p_order_id: order.id,
      p_note: note || null,
    });
  }

  redirect("/admin/orders");
}

export async function rejectComplianceAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const note = read(formData, "review_note");
  const orders = await ordersForAdminAction(formData, "AWAITING_COMPLIANCE");

  for (const order of orders) {
    await supabase.rpc("reject_compliance", {
      p_order_id: order.id,
      p_note: note || null,
    });
  }

  redirect("/admin/orders");
}

export async function simulateTransferAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const orders = await ordersForAdminAction(formData, "AWAITING_TRANSFER");

  for (const order of orders) {
    await supabase.rpc("simulate_transfer", { p_order_id: order.id });
  }

  redirect("/admin/orders");
}

export async function simulateSettlementAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const orders = await ordersForAdminAction(formData, "AWAITING_SETTLEMENT");

  for (const order of orders) {
    if (isPaymentsConfigured()) {
      const transfer = await transferOrderSellerProceeds(order.id);

      if (transfer.error) {
        console.error("transferOrderSellerProceeds failed", transfer.error);
        continue;
      }
    }

    const { error } = await supabase.rpc("simulate_settlement", {
      p_order_id: order.id,
    });

    if (!error) {
      try {
        await sendSettledOrderInvoice(order.id);
      } catch (mailError) {
        const message =
          mailError instanceof Error
            ? mailError.message
            : "Invoice email failed.";
        console.error("sendSettledOrderInvoice failed", message);
      }
    }
  }

  redirect("/admin/orders");
}
