export const TRANSFER_PROCESS_CODES = [
  "QLD_SALE",
  "QLD_LEASE",
  "SIMULATED",
] as const;

export type TransferProcessCode = (typeof TRANSFER_PROCESS_CODES)[number];

export const TRANSFER_APPLICATION_STATUSES = [
  "READY",
  "DOCUMENT_GENERATED",
  "AWAITING_SIGNED_PACK",
  "ADMIN_REVIEW",
  "SUBMITTED",
  "PROCESSING",
  "APPROVED",
  "ACTION_REQUIRED",
] as const;

export type TransferApplicationStatus =
  (typeof TRANSFER_APPLICATION_STATUSES)[number];

export const TRANSFER_DOCUMENT_TYPES = [
  "UNSIGNED_APPLICATION",
  "SIGNED_PACK",
  "SUPPORTING",
] as const;

export type TransferDocumentType = (typeof TRANSFER_DOCUMENT_TYPES)[number];

export const TRANSFER_PROFILE_FIELDS = [
  "entity_kind",
  "legal_name",
  "abn",
  "acn",
  "phone_or_mobile",
  "registered_address",
  "postal_address",
  "qld_client_number",
  "qld_licence_number",
] as const;

export type TransferProfileField = (typeof TRANSFER_PROFILE_FIELDS)[number];

export type JurisdictionTransferProcess = {
  code: TransferProcessCode;
  jurisdictionCode: string | null;
  offering: "SALE" | "LEASE" | null;
  formType: string | null;
  formVersion: string | null;
  title: string;
  usesSimulatedTransfer: boolean;
  requiredProfileFields: readonly TransferProfileField[];
};

export type TransferApplication = {
  id: number;
  order_id: number;
  process_code: TransferProcessCode;
  form_type: string | null;
  form_version: string | null;
  status: TransferApplicationStatus;
  fq_reference: string | null;
  submission_method: string | null;
  submitted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TransferDocument = {
  id: number;
  application_id: number;
  document_type: TransferDocumentType;
  form_type: string | null;
  form_version: string | null;
  storage_path: string;
  original_filename: string | null;
  created_at: string;
};

export type TransferFormTemplate = {
  id: number;
  jurisdiction_id: number | null;
  offering: "SALE" | "LEASE";
  form_type: string;
  form_version: string;
  title: string;
  active: boolean;
};

export const TRANSFER_DOCUMENTS_BUCKET = "transfer-documents";

export function isTransferProcessCode(
  value: string,
): value is TransferProcessCode {
  return (TRANSFER_PROCESS_CODES as readonly string[]).includes(value);
}

export function isTransferApplicationStatus(
  value: string,
): value is TransferApplicationStatus {
  return (TRANSFER_APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function isTransferDocumentType(
  value: string,
): value is TransferDocumentType {
  return (TRANSFER_DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function transferDocumentPath(orderId: number, documentId: number) {
  return `/orders/${orderId}/transfer/${documentId}`;
}

export function transferApplicationStatusLabel(status: TransferApplicationStatus) {
  switch (status) {
    case "READY":
      return "Ready to prepare";
    case "DOCUMENT_GENERATED":
      return "Application generated";
    case "AWAITING_SIGNED_PACK":
      return "Waiting for signed application";
    case "ADMIN_REVIEW":
      return "Admin review";
    case "SUBMITTED":
      return "Submitted to Fisheries Queensland";
    case "PROCESSING":
      return "Fisheries Queensland processing";
    case "APPROVED":
      return "Fisheries Queensland approved";
    case "ACTION_REQUIRED":
      return "Action required";
  }
}
