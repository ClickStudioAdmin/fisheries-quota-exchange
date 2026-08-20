import type { TransferDocumentType } from "@/lib/transfers/types";

export type TransferFilenameKind = "unsigned" | "seller-signed" | "completed-pack";

const KIND_BY_TYPE: Record<
  Exclude<TransferDocumentType, "SUPPORTING">,
  TransferFilenameKind
> = {
  UNSIGNED_APPLICATION: "unsigned",
  SELLER_SIGNED: "seller-signed",
  SIGNED_PACK: "completed-pack",
};

function slug(value: string, allowEmpty = false) {
  const next = value.replace(/[^A-Za-z0-9]+/g, allowEmpty ? "" : "-");
  return allowEmpty ? next : next || "form";
}

export function nextTransferDocumentVersion(
  documents: readonly { document_type: string }[],
  type: TransferDocumentType,
) {
  return documents.filter((document) => document.document_type === type).length + 1;
}

export function transferStoredFilename(input: {
  orderId: number;
  kind: TransferFilenameKind;
  formType?: string | null;
  formVersion?: string | null;
  version: number;
}) {
  const form = slug(input.formType ?? "form");
  const formVersion = slug(input.formVersion ?? "", true);
  const formPart = formVersion ? `${form}-${formVersion}` : form;
  return `FQX-order-${input.orderId}-${formPart}-${input.kind}-v${input.version}.pdf`;
}

export function transferStoredFilenameForType(input: {
  orderId: number;
  type: Exclude<TransferDocumentType, "SUPPORTING">;
  formType?: string | null;
  formVersion?: string | null;
  version: number;
}) {
  return transferStoredFilename({
    orderId: input.orderId,
    kind: KIND_BY_TYPE[input.type],
    formType: input.formType,
    formVersion: input.formVersion,
    version: input.version,
  });
}

export function currentTransferDocuments<
  T extends { document_type: string; created_at: string },
>(documents: readonly T[]) {
  const latestUnsigned = newestOf(documents, "UNSIGNED_APPLICATION");
  const start = latestUnsigned ? Date.parse(latestUnsigned.created_at) : Number.NaN;

  function currentOf(type: string) {
    if (!latestUnsigned || !Number.isFinite(start)) {
      return null;
    }

    return (
      newestOf(
        documents.filter((document) => {
          if (document.document_type !== type) {
            return false;
          }

          const created = Date.parse(document.created_at);
          return Number.isFinite(created) && created >= start;
        }),
        type,
      )
    );
  }

  return {
    latestUnsigned,
    latestSellerSigned: currentOf("SELLER_SIGNED"),
    latestSignedPack: currentOf("SIGNED_PACK"),
  };
}

function newestOf<T extends { document_type: string; created_at: string }>(
  documents: readonly T[],
  type: string,
) {
  return documents
    .filter((document) => document.document_type === type)
    .slice()
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0] ??
    null;
}
