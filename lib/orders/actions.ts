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
  notifyOrderCreated,
  notifyComplianceRejected,
  notifySettlementFailed,
  notifyTransferComplete,
  notifyTransferException,
  notifyTransferInProgress,
} from "@/lib/email/events";
import {
  isOrderQueueStatus,
  orderQueuePath,
  parseOrderIds,
  type OrderFormState,
  type OrderStatus,
} from "@/lib/orders/types";
import { userFacingError } from "@/lib/errors/user-message";
import { requireBusinessAccountError } from "@/lib/organisations/eligibility";
import { canBuyForOrganisation } from "@/lib/organisations/permissions";
import {
  ACTIVE_ORGANISATION_REQUIRED_MESSAGE,
  getActiveOrganisation,
} from "@/lib/organisations/active-session";
import {
  BUYER_PURCHASE_ACKNOWLEDGEMENTS,
  requireAcknowledgements,
} from "@/lib/terms/acknowledgements";
import { requireTermsError } from "@/lib/terms/queries";

function read(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function redirectAfterOrderQueue(formData: FormData) {
  redirect(orderQueuePath(formData.getAll("review_queue").map(String)));
}

async function currentOrderForStatus(formData: FormData, status: OrderStatus) {
  const orderId = Number(formData.get("order_id"));

  if (!Number.isInteger(orderId)) {
    return null;
  }

  const order = await getOrder(orderId);

  if (!order || order.status !== status) {
    return null;
  }

  return order;
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
  const active = await getActiveOrganisation();

  if (!Number.isInteger(listingId)) {
    return { error: "Listing not found." };
  }

  if (!active) {
    return { error: ACTIVE_ORGANISATION_REQUIRED_MESSAGE };
  }

  if (!canBuyForOrganisation(active.role)) {
    return { error: "Only owners and admins can buy for this business." };
  }

  const buyerOrganisationId = active.id;

  const listing = await getListing(listingId);

  if (!listing) {
    return { error: "Listing not found." };
  }

  if (listing.organisation_id === buyerOrganisationId) {
    return {
      error:
        "You cannot purchase this listing while using the seller’s business. Switch business to buy as another business.",
    };
  }

  const termsError = await requireTermsError();

  if (termsError) {
    return { error: termsError };
  }

  const accountError = await requireBusinessAccountError();

  if (accountError) {
    return { error: accountError };
  }

  const ackError = requireAcknowledgements(
    formData,
    BUYER_PURCHASE_ACKNOWLEDGEMENTS,
  );

  if (ackError) {
    return { error: ackError };
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

  const order = await getOrder(Number(data));
  if (order) {
    await notifyOrderCreated(order, listing);
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

  if (!(await isPlatformAdmin())) {
    const order = await getOrder(orderId);
    const active = await getActiveOrganisation();

    if (
      !order ||
      !active ||
      active.id !== order.buyer_organisation_id ||
      !canBuyForOrganisation(active.role)
    ) {
      redirect(next);
    }
  }

  await supabase.rpc("cancel_order", { p_order_id: orderId });
  redirect(next);
}

export async function startOrderQueueAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const expected = String(formData.get("expected_status") ?? "");
  const selected = parseOrderIds(formData.getAll("ids").map(String).join(","));

  if (!isOrderQueueStatus(expected) || selected.length === 0) {
    redirect("/admin/orders");
  }

  const found = await Promise.all(selected.map(getOrder));

  if (
    found.some(
      (order) => order == null || order.status !== expected,
    )
  ) {
    redirect("/admin/orders");
  }

  redirect(orderQueuePath(selected));
}

export async function approveComplianceAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const order = await currentOrderForStatus(formData, "AWAITING_COMPLIANCE");
  const note = read(formData, "review_note");

  if (order) {
    await supabase.rpc("approve_compliance", {
      p_order_id: order.id,
      p_note: note || null,
    });
    const updated = await getOrder(order.id);
    if (updated) {
      await notifyTransferInProgress(updated);
    }
  }

  redirectAfterOrderQueue(formData);
}

export async function rejectComplianceAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const order = await currentOrderForStatus(formData, "AWAITING_COMPLIANCE");
  const note = read(formData, "review_note");

  if (order) {
    const { error } = await supabase.rpc("reject_compliance", {
      p_order_id: order.id,
      p_note: note || null,
    });

    if (!error) {
      await notifyComplianceRejected(order, note);
    }
  }

  redirectAfterOrderQueue(formData);
}

export async function simulateTransferAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const order = await currentOrderForStatus(formData, "AWAITING_TRANSFER");

  if (order) {
    const { error } = await supabase.rpc("simulate_transfer", {
      p_order_id: order.id,
    });
    if (error) {
      await notifyTransferException(
        order,
        error.message || "Simulated authority transfer failed.",
      );
    } else {
      const updated = await getOrder(order.id);
      if (updated) {
        await notifyTransferComplete(updated);
      }
    }
  }

  redirectAfterOrderQueue(formData);
}

export async function simulateSettlementAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const order = await currentOrderForStatus(formData, "AWAITING_SETTLEMENT");

  if (order) {
    if (isPaymentsConfigured()) {
      const transfer = await transferOrderSellerProceeds(order.id);

      if (transfer.error) {
        console.error("transferOrderSellerProceeds failed", transfer.error);
        await notifySettlementFailed(order);
        redirectAfterOrderQueue(formData);
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

  redirectAfterOrderQueue(formData);
}
