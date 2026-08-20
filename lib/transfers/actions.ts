"use server";

import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import { userFacingError } from "@/lib/errors/user-message";
import {
  notifyTransferApplicationReady,
  notifyTransferComplete,
  notifyTransferException,
} from "@/lib/email/events";
import { getOrder } from "@/lib/orders/queries";
import { revalidateOrderSurfaces } from "@/lib/orders/revalidate";
import { orderQueuePath } from "@/lib/orders/types";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import { getActiveOrganisation } from "@/lib/organisations/active-session";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  generateTransferApplicationPdf,
  unsignedTransferFilename,
} from "@/lib/transfers/generate";
import {
  getTransferWorkspace,
  setTransferApplicationStatus,
  transferPdfData,
  writeOrderAudit,
} from "@/lib/transfers/queries";
import { TRANSFER_DOCUMENTS_BUCKET } from "@/lib/transfers/types";

export type TransferFormState = {
  error?: string;
  message?: string;
};

function read(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function redirectAfterQueue(formData: FormData): never {
  const orderId = Number(formData.get("order_id"));
  revalidateOrderSurfaces(
    Number.isInteger(orderId) && orderId > 0 ? orderId : undefined,
  );
  redirect(orderQueuePath(formData.getAll("review_queue").map(String)));
}

async function canManageTransfer(order: {
  buyer_organisation_id: number;
  seller_organisation_id: number;
}) {
  if (await isPlatformAdmin()) {
    return true;
  }

  const active = await getActiveOrganisation();

  if (!active) {
    return false;
  }

  const isParty =
    active.id === order.buyer_organisation_id ||
    active.id === order.seller_organisation_id;

  return isParty && canEditOrganisation(active.role);
}

function revalidateTransfer(orderId: number) {
  revalidateOrderSurfaces(orderId);
}

async function storeTransferFile(input: {
  orderId: number;
  applicationId: number;
  file: Blob;
  contentType: string;
  documentType: "UNSIGNED_APPLICATION" | "SIGNED_PACK" | "SUPPORTING";
  formType: string | null;
  formVersion: string | null;
  filename: string;
}) {
  const supabase = await createClient();
  const user = await getUser();

  if (!supabase || !user) {
    return { error: "You must be signed in." };
  }

  const path = `${input.orderId}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(TRANSFER_DOCUMENTS_BUCKET)
    .upload(path, input.file, {
      contentType: input.contentType,
      upsert: false,
    });

  if (uploadError) {
    return { error: userFacingError(uploadError) };
  }

  const { data, error } = await supabase
    .from("transfer_documents")
    .insert({
      application_id: input.applicationId,
      document_type: input.documentType,
      form_type: input.formType,
      form_version: input.formVersion,
      storage_path: path,
      original_filename: input.filename,
      created_by_email: user.email ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    await supabase.storage.from(TRANSFER_DOCUMENTS_BUCKET).remove([path]);
    return { error: userFacingError(error ?? "Could not store that document.") };
  }

  return { error: null, documentId: Number(data.id), path };
}

export async function generateTransferDocumentAction(
  _prev: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  const orderId = Number(formData.get("order_id"));

  if (!Number.isInteger(orderId)) {
    return { error: "Order not found." };
  }

  const workspace = await getTransferWorkspace(orderId);

  if (!workspace || workspace.order.status !== "AWAITING_TRANSFER") {
    return { error: "This order is not waiting for transfer." };
  }

  if (!(await canManageTransfer(workspace.order))) {
    return { error: "You cannot prepare this application." };
  }

  if (workspace.process.usesSimulatedTransfer) {
    return { error: "This fishery uses simulated transfer." };
  }

  if (workspace.application?.status === "APPROVED") {
    return { error: "This transfer is already approved." };
  }

  if (
    workspace.application?.status === "SUBMITTED" ||
    workspace.application?.status === "PROCESSING"
  ) {
    return { error: "Return the application for correction before regenerating." };
  }

  if (workspace.buyerMissing.length > 0 || workspace.sellerMissing.length > 0) {
    return {
      error:
        "Buyer and seller must complete Business Settings → Details before FQX can prepare the application.",
    };
  }

  const pdfData = transferPdfData(workspace);
  const application = workspace.application;

  if (!pdfData || !application) {
    return { error: "Could not prepare the application." };
  }

  let pdf: Buffer;
  try {
    pdf = Buffer.from(await generateTransferApplicationPdf(pdfData));
  } catch (error) {
    console.error("generateTransferApplicationPdf failed", error);
    return {
      error: userFacingError(error, "Could not prepare the application PDF."),
    };
  }
  const filename = unsignedTransferFilename({
    orderId,
    formType: pdfData.formType,
    formVersion: pdfData.formVersion,
  });
  const stored = await storeTransferFile({
    orderId,
    applicationId: application.id,
    file: new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    contentType: "application/pdf",
    documentType: "UNSIGNED_APPLICATION",
    formType: pdfData.formType,
    formVersion: pdfData.formVersion,
    filename,
  });

  if (stored.error || !stored.documentId) {
    return { error: stored.error ?? "Could not store the application." };
  }

  const statusResult = await setTransferApplicationStatus(
    application.id,
    "AWAITING_SIGNED_PACK",
  );

  if (statusResult.error) {
    return { error: userFacingError(statusResult.error) };
  }

  await writeOrderAudit(orderId, "TRANSFER_DOCUMENT_GENERATED", {
    document_id: stored.documentId,
    form_type: pdfData.formType,
    form_version: pdfData.formVersion,
  });
  try {
    await notifyTransferApplicationReady(workspace.order, {
      filename,
      pdf,
      documentId: stored.documentId,
    });
  } catch (error) {
    console.error("notifyTransferApplicationReady failed", error);
  }
  revalidateTransfer(orderId);
  return { message: "Application prepared and emailed to buyer and seller." };
}

export async function generateTransferDocumentAdminAction(
  _prev: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  const result = await generateTransferDocumentAction({}, formData);
  if (result.error) {
    return result;
  }
  redirectAfterQueue(formData);
}

export async function uploadSignedPackAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));
  const file = formData.get("signed_pack");

  if (
    !Number.isInteger(orderId) ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  ) {
    redirectAfterQueue(formData);
  }

  const signedFile = file as File;
  const workspace = await getTransferWorkspace(orderId);

  if (
    !workspace?.application ||
    workspace.order.status !== "AWAITING_TRANSFER" ||
    workspace.process.usesSimulatedTransfer
  ) {
    redirectAfterQueue(formData);
  }

  const application = workspace.application;
  const stored = await storeTransferFile({
    orderId: workspace.order.id,
    applicationId: application.id,
    file: signedFile,
    contentType: signedFile.type || "application/pdf",
    documentType: "SIGNED_PACK",
    formType: workspace.process.formType,
    formVersion: workspace.process.formVersion,
    filename: signedFile.name || "signed-pack.pdf",
  });

  if (!stored.error) {
    await setTransferApplicationStatus(application.id, "ADMIN_REVIEW");
    await writeOrderAudit(workspace.order.id, "TRANSFER_SIGNED_PACK_UPLOADED", {
      document_id: stored.documentId,
    });
    revalidateTransfer(workspace.order.id);
  }

  redirectAfterQueue(formData);
}

export async function recordFqSubmissionAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));
  const method = read(formData, "submission_method");
  const reference = read(formData, "fq_reference");
  const notes = read(formData, "notes");
  const workspace = Number.isInteger(orderId)
    ? await getTransferWorkspace(orderId)
    : null;

  if (
    workspace?.application &&
    workspace.latestSignedPack &&
    workspace.order.status === "AWAITING_TRANSFER"
  ) {
    await setTransferApplicationStatus(workspace.application.id, "SUBMITTED", {
      submission_method: method || "Manual",
      fq_reference: reference || null,
      submitted_at: new Date().toISOString(),
      notes: notes || workspace.application.notes,
    });
    await writeOrderAudit(workspace.order.id, "TRANSFER_SUBMITTED", {
      fq_reference: reference || null,
      submission_method: method || "Manual",
    });
    revalidateTransfer(workspace.order.id);
  }

  redirectAfterQueue(formData);
}

export async function recordTransferProcessingAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));
  const workspace = Number.isInteger(orderId)
    ? await getTransferWorkspace(orderId)
    : null;

  if (workspace?.application && workspace.application.status === "SUBMITTED") {
    await setTransferApplicationStatus(workspace.application.id, "PROCESSING");
    await writeOrderAudit(workspace.order.id, "TRANSFER_PROCESSING");
    revalidateTransfer(workspace.order.id);
  }

  redirectAfterQueue(formData);
}

export async function recordTransferActionRequiredAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));
  const notes = read(formData, "notes");
  const workspace = Number.isInteger(orderId)
    ? await getTransferWorkspace(orderId)
    : null;

  if (workspace?.application && workspace.order.status === "AWAITING_TRANSFER") {
    await setTransferApplicationStatus(
      workspace.application.id,
      "ACTION_REQUIRED",
      { notes: notes || null },
    );
    await writeOrderAudit(workspace.order.id, "TRANSFER_ACTION_REQUIRED", {
      notes: notes || null,
    });
    revalidateTransfer(workspace.order.id);
  }

  redirectAfterQueue(formData);
}

export async function approveQldTransferAction(formData: FormData) {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));
  const workspace = Number.isInteger(orderId)
    ? await getTransferWorkspace(orderId)
    : null;

  if (
    workspace?.application &&
    workspace.order.status === "AWAITING_TRANSFER" &&
    (workspace.application.status === "PROCESSING" ||
      workspace.application.status === "SUBMITTED")
  ) {
    await setTransferApplicationStatus(workspace.application.id, "APPROVED");
    await writeOrderAudit(workspace.order.id, "TRANSFER_APPROVED", {
      fq_reference: workspace.application.fq_reference,
    });

    const { error } = await supabase.rpc("simulate_transfer", {
      p_order_id: workspace.order.id,
    });

    if (error) {
      await notifyTransferException(
        workspace.order,
        error.message || "Transfer handoff failed.",
      );
    } else {
      const updated = await getOrder(workspace.order.id);
      if (updated) {
        await notifyTransferComplete(updated);
      }
    }

    revalidateTransfer(workspace.order.id);
  }

  redirectAfterQueue(formData);
}
