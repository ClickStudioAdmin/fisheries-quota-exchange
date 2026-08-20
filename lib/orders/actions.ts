"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createClient, getUser } from "@/lib/supabase/server";
import { isPaymentsConfigured } from "@/lib/payments/env";
import { organisationAcceptsCardPayments } from "@/lib/payments/queries";
import { transferOrderSellerProceeds } from "@/lib/payments/actions";
import { getListing } from "@/lib/listings/queries";
import { getOrder } from "@/lib/orders/queries";
import { revalidateOrderSurfaces } from "@/lib/orders/revalidate";
import { selectedComplianceChecks, checklistIsComplete } from "@/lib/orders/checklist";
import { selectedComplianceUpdateNotes } from "@/lib/orders/compliance-update";
import { getOrderJurisdictionCode } from "@/lib/transfers/queries";
import { getTransferProcess } from "@/lib/transfers/registry";
import { sendSettledOrderInvoice } from "@/lib/orders/settlement-mail";
import {
  notifyOrderCreated,
  notifyComplianceRejected,
  notifyComplianceUpdateRequested,
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
import {
  requireCounterpartyTradeReadyError,
  requireTradeReadyError,
} from "@/lib/organisations/eligibility";
import { getHoldingJurisdictionCode } from "@/lib/fisheries/queries";
import { tradeRequiresQldProfile } from "@/lib/organisations/completeness";
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

function refreshAfterOrderQueue(formData: FormData) {
  const orderId = Number(formData.get("order_id"));
  revalidateOrderSurfaces(
    Number.isInteger(orderId) && orderId > 0 ? orderId : undefined,
  );
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

  const jurisdictionCode = await getHoldingJurisdictionCode(listing.holding_id);
  const requireQld = tradeRequiresQldProfile(jurisdictionCode);
  const accountError = await requireTradeReadyError(buyerOrganisationId, {
    requireQldProfile: requireQld,
  });

  if (accountError) {
    return { error: accountError };
  }

  const sellerError = await requireCounterpartyTradeReadyError(
    listing.organisation_id,
    { requireQldProfile: requireQld },
  );

  if (sellerError) {
    return { error: sellerError };
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
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const supabase = await createClient();
  const orderId = Number(formData.get("order_id"));

  if (!supabase || !Number.isInteger(orderId)) {
    return;
  }

  await supabase.rpc("cancel_order", { p_order_id: orderId });
  revalidateOrderSurfaces(orderId);
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

export async function saveComplianceChecklistAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return { error: "Not a platform admin." };
  }

  const order = await currentOrderForStatus(formData, "AWAITING_COMPLIANCE");

  if (!order) {
    return { error: "Order is not waiting for compliance review." };
  }

  const jurisdictionCode = await getOrderJurisdictionCode(order);
  const process = getTransferProcess(jurisdictionCode, order.offering);
  const completed = selectedComplianceChecks(
    process.complianceChecks,
    formData.getAll("checks").map(String),
  );

  const { error } = await supabase.rpc("save_compliance_checklist", {
    p_order_id: order.id,
    p_completed: completed,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/admin/orders");
  return { message: "Progress saved." };
}

export async function approveComplianceAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const order = await currentOrderForStatus(formData, "AWAITING_COMPLIANCE");
  const note = read(formData, "review_note");

  if (order) {
    const jurisdictionCode = await getOrderJurisdictionCode(order);
    const process = getTransferProcess(jurisdictionCode, order.offering);
    if (
      !checklistIsComplete(
        process.complianceChecks,
        order.compliance_checklist,
      )
    ) {
      return;
    }

    await supabase.rpc("approve_compliance", {
      p_order_id: order.id,
      p_note: note || null,
    });
    const updated = await getOrder(order.id);
    if (updated) {
      await notifyTransferInProgress(updated);
    }
  }

  refreshAfterOrderQueue(formData);
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

  refreshAfterOrderQueue(formData);
}

export async function requestComplianceUpdateAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return { error: "Not a platform admin." };
  }

  const order = await currentOrderForStatus(formData, "AWAITING_COMPLIANCE");

  if (!order) {
    return { error: "Order is not waiting for compliance review." };
  }

  const selected = selectedComplianceUpdateNotes({
    notifyBuyer: formData.get("notify_buyer") === "1",
    buyerNote: read(formData, "buyer_note"),
    notifySeller: formData.get("notify_seller") === "1",
    sellerNote: read(formData, "seller_note"),
  });

  if ("error" in selected) {
    return { error: selected.error };
  }

  const { error } = await supabase.rpc("request_compliance_update", {
    p_order_id: order.id,
    p_buyer_note: selected.buyerNote,
    p_seller_note: selected.sellerNote,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  await notifyComplianceUpdateRequested(order, selected);
  revalidateOrderSurfaces(order.id);
  return { message: "Update requested." };
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

  refreshAfterOrderQueue(formData);
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
        refreshAfterOrderQueue(formData);
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

  refreshAfterOrderQueue(formData);
}
