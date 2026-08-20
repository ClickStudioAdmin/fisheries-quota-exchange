"use server";

import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/access";
import { userFacingError } from "@/lib/errors/user-message";
import {
  notifyTransferApplicationReady,
  notifyTransferBuyerFormReady,
  notifyTransferBuyerSignedReceived,
  notifyTransferComplete,
  notifyTransferException,
  notifyTransferSellerPackReturned,
  notifyTransferSellerSignedReceived,
} from "@/lib/email/events";
import { selectedComplianceChecks, checklistIsComplete } from "@/lib/orders/checklist";
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
  getTransferDocumentFile,
  getTransferWorkspace,
  setTransferApplicationStatus,
  transferPdfData,
  writeOrderAudit,
  type TransferWorkspace,
} from "@/lib/transfers/queries";
import { TRANSFER_DOCUMENTS_BUCKET } from "@/lib/transfers/types";
import type { TransferDocumentType } from "@/lib/transfers/types";

export type TransferFormState = {
  error?: string;
  message?: string;
  completed?: string[];
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

async function releaseSellerPackToBuyer(workspace: TransferWorkspace) {
  if (!workspace.application || !workspace.latestSellerSigned) {
    return;
  }

  const document = workspace.latestSellerSigned;
  await setTransferApplicationStatus(
    workspace.application.id,
    "AWAITING_BUYER_SIGNATURE",
    { notes: null },
  );
  await writeOrderAudit(workspace.order.id, "TRANSFER_SELLER_PACK_ACCEPTED", {
    document_id: document.id,
  });

  try {
    const file = await getTransferDocumentFile(
      workspace.order.id,
      document.id,
    );
    if (file) {
      await notifyTransferBuyerFormReady(workspace.order, {
        filename: file.filename,
        pdf: file.buffer,
        documentId: document.id,
      });
    }
  } catch (error) {
    console.error("notifyTransferBuyerFormReady failed", error);
  }
}

async function storeTransferFile(input: {
  orderId: number;
  applicationId: number;
  file: Blob;
  contentType: string;
  documentType: TransferDocumentType;
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
    "AWAITING_SELLER_SIGNATURE",
    { seller_pack_checklist: [] },
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
  return { message: "Application prepared and emailed to the seller." };
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

export async function uploadPartyTransferDocumentAction(
  _prev: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  const orderId = Number(formData.get("order_id"));
  const file = formData.get("signed_pack");

  if (
    !Number.isInteger(orderId) ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  ) {
    return { error: "Choose a PDF up to 10 MB." };
  }

  if (file.type && file.type !== "application/pdf") {
    return { error: "Upload a PDF." };
  }

  const workspace = await getTransferWorkspace(orderId);

  if (
    !workspace?.application ||
    workspace.order.status !== "AWAITING_TRANSFER" ||
    workspace.process.usesSimulatedTransfer
  ) {
    return { error: "This order is not waiting for a signed form." };
  }

  if (!(await canManageTransfer(workspace.order))) {
    return { error: "You cannot upload this document." };
  }

  const supabase = await createClient();

  if (!supabase) {
    return { error: "You must be signed in." };
  }

  const path = `${workspace.order.id}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(TRANSFER_DOCUMENTS_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return { error: userFacingError(uploadError) };
  }

  const { data, error } = await supabase.rpc("record_party_transfer_upload", {
    p_order_id: workspace.order.id,
    p_storage_path: path,
    p_filename: file.name || "signed-form.pdf",
  });

  if (error) {
    await supabase.storage.from(TRANSFER_DOCUMENTS_BUCKET).remove([path]);
    return { error: userFacingError(error) };
  }

  const status = workspace.application.status;
  try {
    if (status === "AWAITING_SELLER_SIGNATURE") {
      await notifyTransferSellerSignedReceived(workspace.order);
    } else if (status === "AWAITING_BUYER_SIGNATURE") {
      await notifyTransferBuyerSignedReceived(workspace.order);
    }
  } catch (notifyError) {
    console.error("party transfer upload notify failed", notifyError);
  }

  revalidateTransfer(workspace.order.id);
  return {
    message:
      status === "AWAITING_SELLER_SIGNATURE"
        ? "Uploaded. FQX will check the seller-signed form before the buyer can access it."
        : "Uploaded. FQX will review the completed pack.",
  };
}

export async function uploadSignedPackAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));
  const packKind = read(formData, "pack_kind") || "signed_pack";
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
    workspace.process.usesSimulatedTransfer ||
    !workspace.latestUnsigned
  ) {
    redirectAfterQueue(formData);
  }

  const application = workspace.application;
  const status = application.status;
  const sellerSigned =
    packKind === "seller_signed" && status === "AWAITING_SELLER_SIGNATURE";
  const completedPack =
    packKind === "signed_pack" &&
    (status === "AWAITING_SELLER_SIGNATURE" ||
      status === "AWAITING_SELLER_PACK_REVIEW" ||
      status === "AWAITING_BUYER_SIGNATURE");

  if (!sellerSigned && !completedPack) {
    redirectAfterQueue(formData);
  }

  const stored = await storeTransferFile({
    orderId: workspace.order.id,
    applicationId: application.id,
    file: signedFile,
    contentType: signedFile.type || "application/pdf",
    documentType: sellerSigned ? "SELLER_SIGNED" : "SIGNED_PACK",
    formType: workspace.process.formType,
    formVersion: workspace.process.formVersion,
    filename: signedFile.name || "signed-pack.pdf",
  });

  if (!stored.error) {
    await setTransferApplicationStatus(
      application.id,
      sellerSigned ? "AWAITING_SELLER_PACK_REVIEW" : "ADMIN_REVIEW",
      sellerSigned ? { seller_pack_checklist: [] } : {},
    );
    await writeOrderAudit(
      workspace.order.id,
      sellerSigned
        ? "TRANSFER_SELLER_SIGNED_UPLOADED"
        : "TRANSFER_SIGNED_PACK_UPLOADED",
      { document_id: stored.documentId },
    );
    try {
      if (sellerSigned) {
        await notifyTransferSellerSignedReceived(workspace.order);
      } else {
        await notifyTransferBuyerSignedReceived(workspace.order);
      }
    } catch (error) {
      console.error("admin transfer upload notify failed", error);
    }
    revalidateTransfer(workspace.order.id);
  }

  redirectAfterQueue(formData);
}

export async function saveSellerPackChecklistAction(
  _prev: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  const supabase = await createClient();

  if (!supabase || !(await isPlatformAdmin())) {
    return { error: "Not a platform admin." };
  }

  const orderId = Number(formData.get("order_id"));
  const workspace = Number.isInteger(orderId)
    ? await getTransferWorkspace(orderId)
    : null;

  if (
    !workspace?.application ||
    workspace.application.status !== "AWAITING_SELLER_PACK_REVIEW"
  ) {
    return { error: "Seller signed form is not waiting for review." };
  }

  const intent = read(formData, "intent") || "save";
  let completed = workspace.application.seller_pack_checklist;

  if (intent !== "release") {
    completed = selectedComplianceChecks(
      workspace.process.sellerPackChecks,
      formData.getAll("checks").map(String),
    );
    const { error } = await supabase.rpc("save_seller_pack_checklist", {
      p_order_id: workspace.order.id,
      p_completed: completed,
    });

    if (error) {
      return { error: userFacingError(error), completed };
    }
  }

  if (intent === "save") {
    return { message: "Progress saved.", completed };
  }

  if (
    !workspace.latestSellerSigned ||
    !checklistIsComplete(workspace.process.sellerPackChecks, completed)
  ) {
    return {
      error: "Save all checks before releasing to the buyer.",
      completed,
    };
  }

  await releaseSellerPackToBuyer(workspace);
  redirectAfterQueue(formData);
}

export async function returnSellerPackAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    return;
  }

  const orderId = Number(formData.get("order_id"));
  const notes = read(formData, "notes");
  const workspace = Number.isInteger(orderId)
    ? await getTransferWorkspace(orderId)
    : null;

  if (
    !workspace?.application ||
    workspace.application.status !== "AWAITING_SELLER_PACK_REVIEW"
  ) {
    redirectAfterQueue(formData);
  }

  await setTransferApplicationStatus(
    workspace.application.id,
    "AWAITING_SELLER_SIGNATURE",
    { notes: notes || null, seller_pack_checklist: [] },
  );
  await writeOrderAudit(workspace.order.id, "TRANSFER_SELLER_PACK_RETURNED", {
    notes: notes || null,
  });
  try {
    await notifyTransferSellerPackReturned(
      workspace.order,
      notes || "FQX returned the seller-signed form.",
    );
  } catch (error) {
    console.error("notifyTransferSellerPackReturned failed", error);
  }

  revalidateTransfer(workspace.order.id);
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
