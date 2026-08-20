import "server-only";

import { createClient, getUser } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getFishery, getHolding, listJurisdictions } from "@/lib/fisheries/queries";
import { listingOfferingLabel } from "@/lib/listings/types";
import { parseComplianceChecklist } from "@/lib/orders/checklist";
import { getActiveOrganisation } from "@/lib/organisations/active-session";
import { canDownloadTransferDocument } from "@/lib/transfers/access";
import { getOrder } from "@/lib/orders/queries";
import type { Order } from "@/lib/orders/types";
import { isEntityKind } from "@/lib/organisations/types";
import { parseAustralianAddress } from "@/lib/organisations/address";
import { currentTransferDocuments } from "@/lib/transfers/filenames";
import { missingTransferProfileFields } from "@/lib/transfers/profile";
import { getTransferProcess } from "@/lib/transfers/registry";
import type { TransferApplicationPdfData, TransferPartyDetails, TransferSignatory } from "@/lib/transfers/application-data";
import {
  isTransferApplicationStatus,
  isTransferDocumentType,
  isTransferProcessCode,
  TRANSFER_DOCUMENTS_BUCKET,
  type JurisdictionTransferProcess,
  type TransferApplication,
  type TransferApplicationStatus,
  type TransferDocument,
  type TransferProfileField,
} from "@/lib/transfers/types";

function asNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asSignatories(value: unknown): TransferSignatory[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const row = item as Record<string, unknown>;
    const fullName = asNullableText(row.full_name) ?? "";
    const role = asNullableText(row.role);
    if (!role) {
      return [];
    }
    return [{ full_name: fullName, role }];
  });
}

function parseParty(value: unknown): TransferPartyDetails | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = Number(row.id);
  const legalName = asNullableText(row.legal_name) ?? "";

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const profileRaw =
    row.profile && typeof row.profile === "object"
      ? (row.profile as Record<string, unknown>)
      : null;

  return {
    id,
    legal_name: legalName,
    trading_name: asNullableText(row.trading_name),
    abn: asNullableText(row.abn),
    entity_kind:
      typeof row.entity_kind === "string" && isEntityKind(row.entity_kind)
        ? row.entity_kind
        : null,
    acn: asNullableText(row.acn),
    mobile: asNullableText(row.mobile),
    registered_address: parseAustralianAddress(row.registered_address),
    postal_address: parseAustralianAddress(row.postal_address),
    postal_same_as_registered: row.postal_same_as_registered !== false,
    signatories: asSignatories(row.signatories),
    profile: profileRaw
      ? {
          organisation_id: Number(profileRaw.organisation_id) || id,
          jurisdiction_id: Number(profileRaw.jurisdiction_id) || 0,
          client_reference: asNullableText(profileRaw.client_reference),
          licence_number: asNullableText(profileRaw.licence_number),
          fishery_symbols: asNullableText(profileRaw.fishery_symbols),
        }
      : null,
  };
}

function mapApplication(row: Record<string, unknown>): TransferApplication | null {
  const processCode = String(row.process_code ?? "");
  const status = String(row.status ?? "");

  if (!isTransferProcessCode(processCode) || !isTransferApplicationStatus(status)) {
    return null;
  }

  return {
    id: Number(row.id),
    order_id: Number(row.order_id),
    process_code: processCode,
    form_type: asNullableText(row.form_type),
    form_version: asNullableText(row.form_version),
    status,
    fq_reference: asNullableText(row.fq_reference),
    submission_method: asNullableText(row.submission_method),
    submitted_at: asNullableText(row.submitted_at),
    notes: asNullableText(row.notes),
    seller_pack_checklist: parseComplianceChecklist(row.seller_pack_checklist),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapDocument(row: Record<string, unknown>): TransferDocument | null {
  const documentType = String(row.document_type ?? "");

  if (!isTransferDocumentType(documentType)) {
    return null;
  }

  return {
    id: Number(row.id),
    application_id: Number(row.application_id),
    document_type: documentType,
    form_type: asNullableText(row.form_type),
    form_version: asNullableText(row.form_version),
    storage_path: String(row.storage_path),
    original_filename: asNullableText(row.original_filename),
    created_at: String(row.created_at),
  };
}

export async function getOrderJurisdictionCode(order: Order) {
  const holding = await getHolding(order.holding_id);

  if (!holding) {
    return null;
  }

  const [fishery, jurisdictions] = await Promise.all([
    getFishery(holding.fishery_id),
    listJurisdictions(),
  ]);

  if (!fishery) {
    return null;
  }

  return (
    jurisdictions.find((item) => item.id === fishery.jurisdiction_id)?.code ??
    null
  );
}

async function loadApplication(orderId: number) {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("transfer_applications")
    .select(
      "id, order_id, process_code, form_type, form_version, status, fq_reference, submission_method, submitted_at, notes, seller_pack_checklist, created_at, updated_at",
    )
    .eq("order_id", orderId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapApplication(data as Record<string, unknown>);
}

export async function listTransferApplicationsByOrderIds(orderIds: number[]) {
  const unique = [
    ...new Set(
      orderIds.filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  const byOrderId = new Map<
    number,
    { process_code: string; status: string }
  >();

  if (unique.length === 0) {
    return byOrderId;
  }

  const supabase = await createClient();

  if (!supabase) {
    return byOrderId;
  }

  const { data, error } = await supabase
    .from("transfer_applications")
    .select("order_id, process_code, status")
    .in("order_id", unique);

  if (error || !data) {
    return byOrderId;
  }

  for (const row of data) {
    const orderId = Number((row as { order_id?: unknown }).order_id);
    const processCode = String((row as { process_code?: unknown }).process_code ?? "");
    const status = String((row as { status?: unknown }).status ?? "");

    if (!Number.isInteger(orderId) || orderId <= 0 || !processCode) {
      continue;
    }

    byOrderId.set(orderId, { process_code: processCode, status });
  }

  return byOrderId;
}

async function loadDocuments(applicationId: number) {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("transfer_documents")
    .select(
      "id, application_id, document_type, form_type, form_version, storage_path, original_filename, created_at",
    )
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => mapDocument(row as Record<string, unknown>))
    .filter((row): row is TransferDocument => row != null);
}

async function loadPartyProfiles(orderId: number) {
  const supabase = await createClient();

  if (!supabase) {
    return { buyer: null, seller: null };
  }

  const { data, error } = await supabase.rpc("get_transfer_party_profiles", {
    p_order_id: orderId,
  });

  if (error || !data || typeof data !== "object") {
    return { buyer: null, seller: null };
  }

  const payload = data as Record<string, unknown>;
  return {
    buyer: parseParty(payload.buyer),
    seller: parseParty(payload.seller),
  };
}

export async function ensureTransferApplication(
  order: Order,
  process: JurisdictionTransferProcess,
) {
  const existing = await loadApplication(order.id);

  if (existing) {
    return existing;
  }

  if (order.status !== "AWAITING_TRANSFER") {
    return null;
  }

  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { error } = await supabase.from("transfer_applications").insert({
    order_id: order.id,
    process_code: process.code,
    form_type: process.formType,
    form_version: process.formVersion,
    status: "READY",
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    console.error("ensureTransferApplication failed", error.message);
  }

  return loadApplication(order.id);
}

export type TransferWorkspace = {
  order: Order;
  process: JurisdictionTransferProcess;
  jurisdictionCode: string | null;
  application: TransferApplication | null;
  documents: TransferDocument[];
  buyer: TransferPartyDetails | null;
  seller: TransferPartyDetails | null;
  buyerMissing: TransferProfileField[];
  sellerMissing: TransferProfileField[];
  latestUnsigned: TransferDocument | null;
  latestSellerSigned: TransferDocument | null;
  latestSignedPack: TransferDocument | null;
};

export async function getTransferWorkspace(
  orderId: number,
): Promise<TransferWorkspace | null> {
  const order = await getOrder(orderId);

  if (!order) {
    return null;
  }

  const jurisdictionCode = await getOrderJurisdictionCode(order);
  const process = getTransferProcess(jurisdictionCode, order.offering);
  const application = process.usesSimulatedTransfer
    ? await loadApplication(order.id)
    : await ensureTransferApplication(order, process);
  const documents = application ? await loadDocuments(application.id) : [];
  const parties = await loadPartyProfiles(order.id);
  const buyerMissing = parties.buyer
    ? missingTransferProfileFields({
        organisation: parties.buyer,
        profile: parties.buyer.profile,
        process,
      })
    : [...process.requiredProfileFields];
  const sellerMissing = parties.seller
    ? missingTransferProfileFields({
        organisation: parties.seller,
        profile: parties.seller.profile,
        process,
      })
    : [...process.requiredProfileFields];

  const current = currentTransferDocuments(documents);

  return {
    order,
    process,
    jurisdictionCode,
    application,
    documents,
    buyer: parties.buyer,
    seller: parties.seller,
    buyerMissing,
    sellerMissing,
    latestUnsigned: current.latestUnsigned,
    latestSellerSigned: current.latestSellerSigned,
    latestSignedPack: current.latestSignedPack,
  };
}

export function transferPdfData(
  workspace: TransferWorkspace,
): TransferApplicationPdfData | null {
  const { order, process, buyer, seller } = workspace;

  if (!buyer || !seller || !process.formType || !process.formVersion) {
    return null;
  }

  return {
    orderId: order.id,
    formType: process.formType,
    formVersion: process.formVersion,
    title: process.title,
    offeringLabel: listingOfferingLabel(order.offering),
    fisheryName: order.fishery_name,
    quotaTypeName: order.quota_type_name,
    quantity: String(order.quantity ?? ""),
    unitLabel: order.unit_label,
    seller,
    buyer,
  };
}

export async function getTransferDocumentFile(
  orderId: number,
  documentId: number,
) {
  const user = await getUser();
  const admin = await isPlatformAdmin();
  const workspace = await getTransferWorkspace(orderId);

  if (!user || !workspace) {
    return null;
  }

  const document = workspace.documents.find((item) => item.id === documentId);

  if (!document) {
    return null;
  }

  const active = await getActiveOrganisation();
  const allowed = canDownloadTransferDocument({
    documentType: document.document_type,
    applicationStatus: workspace.application?.status ?? null,
    isAdmin: admin,
    isBuyer: active?.id === workspace.order.buyer_organisation_id,
    isSeller: active?.id === workspace.order.seller_organisation_id,
  });

  if (!allowed) {
    return null;
  }

  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(TRANSFER_DOCUMENTS_BUCKET)
    .download(document.storage_path);

  if (error || !data) {
    return null;
  }

  const filename =
    document.original_filename ??
    `FQX-order-${orderId}-transfer-${document.id}.pdf`;

  return { buffer: Buffer.from(await data.arrayBuffer()), filename };
}

export async function writeOrderAudit(
  orderId: number,
  eventType: string,
  payload: Record<string, unknown> = {},
) {
  const supabase = await createClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc("write_order_audit_event", {
    p_order_id: orderId,
    p_event_type: eventType,
    p_payload: payload,
  });

  if (error) {
    console.error("write_order_audit_event failed", error.message);
  }
}

export async function setTransferApplicationStatus(
  applicationId: number,
  status: TransferApplicationStatus,
  extra: Partial<
    Pick<
      TransferApplication,
      | "fq_reference"
      | "submission_method"
      | "submitted_at"
      | "notes"
      | "seller_pack_checklist"
    >
  > = {},
) {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("transfer_applications")
    .update({
      status,
      ...extra,
    })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
