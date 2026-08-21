import "server-only";

import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { pandadocSigningLayoutsForForm } from "@/lib/transfers/pandadoc-fields";
import {
  transferStoredFilenameForType,
} from "@/lib/transfers/filenames";
import type { TransferWorkspace } from "@/lib/transfers/queries";
import { TRANSFER_DOCUMENTS_BUCKET } from "@/lib/transfers/types";
import type { TransferPartyDetails } from "@/lib/transfers/application-data";
import {
  createPandaDocClient,
  PANDADOC_BUYER_ROLE,
  PANDADOC_SELLER_ROLE,
  recipientIdForRole,
  recipientIdForEmail,
  recipientRoleFromEmail,
  type PandaDocClient,
  type PandaDocDocumentDetails,
  type PandaDocRecipient,
} from "@/lib/pandadoc/client";
import { isPandaDocConfigured } from "@/lib/pandadoc/env";
import { verifyPandaDocSignature } from "@/lib/pandadoc/verify";
import {
  notifyTransferRecipientSigned,
  notifyTransferSignOnlineReady,
  notifyTransferOnlinePackReady,
} from "@/lib/email/events";
import { getOrderForSystem } from "@/lib/orders/queries";
import { revalidateOrderSurfaces } from "@/lib/orders/revalidate";
import { pandadocApiRecipientEmail } from "@/lib/pandadoc/sandbox-recipients";

function splitName(party: TransferPartyDetails | null) {
  const fromSignatory = party?.signatories[0]?.full_name.trim() ?? "";
  const source = fromSignatory || party?.legal_name.trim() || "Signatory";
  const parts = source.split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? "Signatory",
    last_name: parts.slice(1).join(" ") || "Party",
  };
}

function recipientFor(
  party: TransferPartyDetails | null,
  role: typeof PANDADOC_SELLER_ROLE | typeof PANDADOC_BUYER_ROLE,
): PandaDocRecipient | null {
  const email = party?.email?.trim();
  if (!email) {
    return null;
  }
  const names = splitName(party);
  return {
    email: pandadocApiRecipientEmail(role, email),
    role,
    ...names,
  };
}

export async function sendUnsignedPdfToPandaDoc(input: {
  workspace: TransferWorkspace;
  pdf: Buffer;
  filename: string;
  client?: PandaDocClient;
}) {
  if (!isPandaDocConfigured() && !input.client) {
    throw new Error("PandaDoc is not configured.");
  }

  const seller = recipientFor(input.workspace.seller, PANDADOC_SELLER_ROLE);
  const buyer = recipientFor(input.workspace.buyer, PANDADOC_BUYER_ROLE);
  if (!seller || !buyer) {
    throw new Error(
      "Buyer and seller need a contact email before Sign online can start.",
    );
  }

  const client = input.client ?? createPandaDocClient();
  const created = await client.createDocumentFromPdf({
    name: `FQX order ${input.workspace.order.id} ${input.workspace.process.formType ?? "transfer"}`,
    pdf: input.pdf,
    filename: input.filename,
    recipients: [seller, buyer],
  });
  const draft = await client.waitUntilDraft(created.id);
  const sellerRecipientId =
    recipientIdForRole(draft, PANDADOC_SELLER_ROLE) ??
    recipientIdForEmail(draft, seller.email);
  const buyerRecipientId =
    recipientIdForRole(draft, PANDADOC_BUYER_ROLE) ??
    recipientIdForEmail(draft, buyer.email);
  if (!sellerRecipientId || !buyerRecipientId) {
    const listed = draft.recipients
      .map((item) => `${item.email}${item.role ? ` (${item.role})` : ""}`)
      .join(", ");
    throw new Error(
      listed
        ? `PandaDoc recipients did not match Seller/Buyer (${listed}).`
        : "PandaDoc did not return Seller and Buyer recipients for signing fields.",
    );
  }

  const fieldCount = await client.createSigningFields({
    documentId: created.id,
    layouts: pandadocSigningLayoutsForForm(
      input.workspace.process.formType ?? "FDU1465",
    ),
    sellerRecipientId,
    buyerRecipientId,
  });
  if (fieldCount < 1) {
    throw new Error(
      "PandaDoc did not create signing fields on the application.",
    );
  }

  await client.sendSilent(created.id);
  return { documentId: created.id, status: "document.sent" };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function webhookEventId(eventName: string, data: Record<string, unknown>) {
  const documentId = asString(data.id) ?? asString(data.uuid) ?? "unknown";
  const actionDate = asString(data.action_date) ?? asString(data.date_modified) ?? "";
  const actor = asString(asRecord(data.action_by)?.email) ?? "";
  return createHash("sha256")
    .update(`${eventName}:${documentId}:${actionDate}:${actor}`)
    .digest("hex");
}

async function loadApplicationByPandaDocId(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  documentId: string,
) {
  const { data, error } = await supabase
    .from("transfer_applications")
    .select("id, order_id, signing_channel, status, pandadoc_seller_completed_at, pandadoc_buyer_completed_at")
    .eq("pandadoc_document_id", documentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as {
    id: number;
    order_id: number;
    signing_channel: string;
    status: string;
    pandadoc_seller_completed_at: string | null;
    pandadoc_buyer_completed_at: string | null;
  };
}

async function applyRecipientCompletion(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  application: {
    id: number;
    order_id: number;
    status: string;
    pandadoc_seller_completed_at: string | null;
    pandadoc_buyer_completed_at: string | null;
  },
  role: string | null,
  completedAt: string,
) {
  if (application.status !== "AWAITING_SIGNATURES") {
    return;
  }

  const patch: Record<string, string> = {
    pandadoc_status: "document.viewed",
  };
  if (role === PANDADOC_SELLER_ROLE && !application.pandadoc_seller_completed_at) {
    patch.pandadoc_seller_completed_at = completedAt;
  }
  if (role === PANDADOC_BUYER_ROLE && !application.pandadoc_buyer_completed_at) {
    patch.pandadoc_buyer_completed_at = completedAt;
  }

  if (Object.keys(patch).length === 1 && !patch.pandadoc_seller_completed_at && !patch.pandadoc_buyer_completed_at) {
    await supabase
      .from("transfer_applications")
      .update({ pandadoc_status: "document.viewed" })
      .eq("id", application.id);
    return;
  }

  await supabase.from("transfer_applications").update(patch).eq("id", application.id);

  const order = await getOrderForSystem(application.order_id);
  if (!order) {
    return;
  }

  const organisationId =
    role === PANDADOC_BUYER_ROLE
      ? order.buyer_organisation_id
      : order.seller_organisation_id;
  const otherDone =
    role === PANDADOC_SELLER_ROLE
      ? Boolean(application.pandadoc_buyer_completed_at)
      : Boolean(application.pandadoc_seller_completed_at);

  try {
    await notifyTransferRecipientSigned(order, {
      organisationId,
      waitingOnOther: !otherDone,
    });
  } catch (error) {
    console.error("notifyTransferRecipientSigned failed", error);
  }
}

async function storeSealedPdf(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  workspace: {
    orderId: number;
    applicationId: number;
    formType: string | null;
    formVersion: string | null;
    version: number;
  },
  pdf: Buffer,
) {
  const filename = transferStoredFilenameForType({
    orderId: workspace.orderId,
    type: "SIGNED_PACK",
    formType: workspace.formType,
    formVersion: workspace.formVersion,
    version: workspace.version,
  });
  const path = `${workspace.orderId}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(TRANSFER_DOCUMENTS_BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await supabase
    .from("transfer_documents")
    .insert({
      application_id: workspace.applicationId,
      document_type: "SIGNED_PACK",
      form_type: workspace.formType,
      form_version: workspace.formVersion,
      storage_path: path,
      original_filename: filename,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    await supabase.storage.from(TRANSFER_DOCUMENTS_BUCKET).remove([path]);
    throw new Error(error?.message ?? "Could not store the sealed PDF.");
  }

  return Number(data.id);
}

async function applyCompletedPdf(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  documentId: string,
  client: PandaDocClient,
) {
  const application = await loadApplicationByPandaDocId(supabase, documentId);
  if (!application || application.signing_channel !== "PANDADOC") {
    return;
  }
  if (
    application.status === "ADMIN_REVIEW" ||
    application.status === "SUBMITTED" ||
    application.status === "PROCESSING" ||
    application.status === "APPROVED"
  ) {
    await supabase
      .from("transfer_applications")
      .update({ pandadoc_status: "document.completed" })
      .eq("id", application.id);
    return;
  }
  if (application.status !== "AWAITING_SIGNATURES") {
    return;
  }

  const pdf = await client.downloadProtectedPdf(documentId);
  const { count } = await supabase
    .from("transfer_documents")
    .select("id", { count: "exact", head: true })
    .eq("application_id", application.id)
    .eq("document_type", "SIGNED_PACK");

  const { data: appRow } = await supabase
    .from("transfer_applications")
    .select("form_type, form_version")
    .eq("id", application.id)
    .maybeSingle();

  await storeSealedPdf(
    supabase,
    {
      orderId: application.order_id,
      applicationId: application.id,
      formType: asString(appRow?.form_type) ?? null,
      formVersion: asString(appRow?.form_version) ?? null,
      version: (count ?? 0) + 1,
    },
    pdf,
  );

  const now = new Date().toISOString();
  await supabase
    .from("transfer_applications")
    .update({
      status: "ADMIN_REVIEW",
      pandadoc_status: "document.completed",
      pandadoc_seller_completed_at:
        application.pandadoc_seller_completed_at ?? now,
      pandadoc_buyer_completed_at:
        application.pandadoc_buyer_completed_at ?? now,
    })
    .eq("id", application.id);

  const order = await getOrderForSystem(application.order_id);
  if (order) {
    try {
      await notifyTransferOnlinePackReady(order);
    } catch (error) {
      console.error("notifyTransferOnlinePackReady failed", error);
    }
  }
}

async function applyDocumentStatus(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  documentId: string,
  status: string,
) {
  const application = await loadApplicationByPandaDocId(supabase, documentId);
  if (!application || application.signing_channel !== "PANDADOC") {
    return;
  }

  if (
    status === "document.declined" ||
    status === "document.voided" ||
    status === "document.expired"
  ) {
    await supabase
      .from("transfer_applications")
      .update({
        status: "ACTION_REQUIRED",
        pandadoc_status: status,
        notes: `PandaDoc reported ${status.replace("document.", "")}.`,
      })
      .eq("id", application.id);
    return;
  }

  await supabase
    .from("transfer_applications")
    .update({ pandadoc_status: status })
    .eq("id", application.id);
}

export async function handlePandaDocWebhook(payload: string, signature: string | null) {
  if (!verifyPandaDocSignature(payload, signature)) {
    throw new Error("Invalid PandaDoc signature.");
  }

  const supabase = createServiceClient();
  if (!supabase) {
    throw new Error("PandaDoc webhook is not configured.");
  }

  const parsed = JSON.parse(payload) as unknown;
  const events = Array.isArray(parsed) ? parsed : [parsed];
  const client = createPandaDocClient();

  for (const item of events) {
    const event = asRecord(item);
    const eventName = asString(event?.event) ?? asString(event?.name) ?? "";
    const data = asRecord(event?.data) ?? event;
    if (!data) {
      continue;
    }
    const documentId = asString(data.id) ?? asString(data.uuid);
    if (!documentId || !eventName) {
      continue;
    }

    const eventId = webhookEventId(eventName, data);

    if (eventName === "recipient_completed") {
      const details = await client.getDocument(documentId);
      const actorEmail =
        asString(asRecord(data.action_by)?.email) ??
        asString(asRecord(data.recipients)?.email);
      const role = actorEmail
        ? recipientRoleFromEmail(details, actorEmail)
        : null;
      const application = await loadApplicationByPandaDocId(supabase, documentId);
      if (application) {
        await applyRecipientCompletion(
          supabase,
          application,
          role,
          asString(data.action_date) ?? new Date().toISOString(),
        );
      }
    } else if (eventName === "document_completed_pdf_ready") {
      await applyCompletedPdf(supabase, documentId, client);
    } else if (eventName === "document_state_changed") {
      const status = asString(data.status) ?? "";
      await applyDocumentStatus(supabase, documentId, status);
    }

    const { data: isNew, error } = await supabase.rpc(
      "record_pandadoc_webhook_event",
      {
        p_event_id: eventId,
        p_event_type: eventName,
      },
    );

    if (error) {
      throw new Error(error.message);
    }
    if (isNew === false) {
      continue;
    }

    const application = await loadApplicationByPandaDocId(supabase, documentId);
    if (application) {
      revalidateOrderSurfaces(application.order_id);
    }
  }
}

export async function reconcilePandaDocSigning(orderId: number) {
  if (!isPandaDocConfigured()) {
    return;
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return;
  }

  const { data } = await supabase
    .from("transfer_applications")
    .select(
      "id, order_id, signing_channel, status, pandadoc_document_id, pandadoc_seller_completed_at, pandadoc_buyer_completed_at",
    )
    .eq("order_id", orderId)
    .maybeSingle();

  if (
    !data ||
    data.signing_channel !== "PANDADOC" ||
    !data.pandadoc_document_id ||
    data.status !== "AWAITING_SIGNATURES"
  ) {
    return;
  }

  const client = createPandaDocClient();
  const details = await client.getDocument(data.pandadoc_document_id);
  await applyDocumentFromDetails(supabase, {
    id: Number(data.id),
    order_id: Number(data.order_id),
    status: String(data.status),
    pandadoc_seller_completed_at:
      asString(data.pandadoc_seller_completed_at),
    pandadoc_buyer_completed_at: asString(data.pandadoc_buyer_completed_at),
  }, details, client);
}

async function applyDocumentFromDetails(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  application: {
    id: number;
    order_id: number;
    status: string;
    pandadoc_seller_completed_at: string | null;
    pandadoc_buyer_completed_at: string | null;
  },
  details: PandaDocDocumentDetails,
  client: PandaDocClient,
) {
  const now = new Date().toISOString();
  for (const recipient of details.recipients) {
    if (!recipient.has_completed) {
      continue;
    }
    await applyRecipientCompletion(
      supabase,
      application,
      recipient.role,
      now,
    );
    if (recipient.role === PANDADOC_SELLER_ROLE) {
      application.pandadoc_seller_completed_at =
        application.pandadoc_seller_completed_at ?? now;
    }
    if (recipient.role === PANDADOC_BUYER_ROLE) {
      application.pandadoc_buyer_completed_at =
        application.pandadoc_buyer_completed_at ?? now;
    }
  }

  if (
    details.status === "document.completed" ||
    details.status === "document.viewed"
  ) {
    const sellerDone = details.recipients.some(
      (item) => item.role === PANDADOC_SELLER_ROLE && item.has_completed,
    );
    const buyerDone = details.recipients.some(
      (item) => item.role === PANDADOC_BUYER_ROLE && item.has_completed,
    );
    if (sellerDone && buyerDone) {
      try {
        await applyCompletedPdf(supabase, details.id, client);
      } catch {
        await supabase
          .from("transfer_applications")
          .update({ pandadoc_status: details.status })
          .eq("id", application.id);
      }
    }
  }

  if (
    details.status === "document.declined" ||
    details.status === "document.voided" ||
    details.status === "document.expired"
  ) {
    await applyDocumentStatus(supabase, details.id, details.status);
  }
}

export async function notifySignOnlineAfterGenerate(
  workspace: TransferWorkspace,
  documentId: number,
) {
  await notifyTransferSignOnlineReady(workspace.order, documentId);
}
