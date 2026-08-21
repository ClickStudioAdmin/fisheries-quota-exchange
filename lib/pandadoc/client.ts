import "server-only";

import { getPandaDocEnv } from "@/lib/pandadoc/env";

const API_BASE = "https://api.pandadoc.com/public/v1";
const DRAFT_WAIT_MS = 60_000;
const DRAFT_POLL_MS = 1_500;

export const PANDADOC_SELLER_ROLE = "Seller";
export const PANDADOC_BUYER_ROLE = "Buyer";

export type PandaDocRecipient = {
  email: string;
  first_name: string;
  last_name: string;
  role: typeof PANDADOC_SELLER_ROLE | typeof PANDADOC_BUYER_ROLE;
};

export type PandaDocDocumentDetails = {
  id: string;
  status: string;
  fieldCount: number;
  recipients: Array<{
    email: string;
    role: string | null;
    has_completed: boolean;
  }>;
};

export type PandaDocClient = {
  createDocumentFromPdf(input: {
    name: string;
    pdf: Buffer;
    filename: string;
    recipients: readonly PandaDocRecipient[];
  }): Promise<{ id: string; status: string }>;
  waitUntilDraft(documentId: string): Promise<PandaDocDocumentDetails>;
  sendSilent(documentId: string): Promise<void>;
  createSession(documentId: string, recipientEmail: string): Promise<string>;
  getDocument(documentId: string): Promise<PandaDocDocumentDetails>;
  downloadProtectedPdf(documentId: string): Promise<Buffer>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapDocument(payload: unknown): PandaDocDocumentDetails {
  const row = asRecord(payload);
  const id = asString(row?.id) ?? asString(row?.uuid);
  const status = asString(row?.status) ?? "";
  if (!id) {
    throw new Error("PandaDoc did not return a document id.");
  }

  const recipientsRaw = Array.isArray(row?.recipients) ? row.recipients : [];
  const fieldsRaw = Array.isArray(row?.fields) ? row.fields : [];
  return {
    id,
    status,
    fieldCount: fieldsRaw.length,
    recipients: recipientsRaw.flatMap((item) => {
      const recipient = asRecord(item);
      const email = asString(recipient?.email);
      if (!email) {
        return [];
      }
      const roles = Array.isArray(recipient?.roles)
        ? recipient.roles.map(String)
        : [];
      const role =
        asString(recipient?.role) ??
        (roles.includes(PANDADOC_SELLER_ROLE)
          ? PANDADOC_SELLER_ROLE
          : roles.includes(PANDADOC_BUYER_ROLE)
            ? PANDADOC_BUYER_ROLE
            : roles[0] ?? null);
      return [
        {
          email,
          role,
          has_completed: Boolean(recipient?.has_completed),
        },
      ];
    }),
  };
}

async function pandaDocRequest(
  apiKey: string,
  path: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `API-Key ${apiKey}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    if (text.includes("outside of your organization")) {
      throw new Error(
        "PandaDoc sandbox can only send to emails on the same domain as your PandaDoc account. Set PANDADOC_SANDBOX_RECIPIENT_EMAIL to that address (Preview only), then generate again.",
      );
    }
    throw new Error(
      `PandaDoc ${path} failed (${response.status}): ${text.slice(0, 400)}`,
    );
  }
  return text ? (JSON.parse(text) as unknown) : null;
}

export function createPandaDocClient(apiKey = getPandaDocEnv()?.apiKey): PandaDocClient {
  if (!apiKey) {
    throw new Error("PandaDoc is not configured.");
  }

  return {
    async createDocumentFromPdf(input) {
      const form = new FormData();
      form.append(
        "file",
        new Blob([new Uint8Array(input.pdf)], { type: "application/pdf" }),
        input.filename,
      );
      form.append(
        "data",
        JSON.stringify({
          name: input.name,
          recipients: input.recipients.map((recipient) => ({
            email: recipient.email,
            first_name: recipient.first_name,
            last_name: recipient.last_name,
            role: recipient.role,
            signing_order: 1,
          })),
          fields: {
            sellerSig: { value: "", role: PANDADOC_SELLER_ROLE },
            sellerDate: { value: "", role: PANDADOC_SELLER_ROLE },
            sellerWitnessSig: { value: "", role: PANDADOC_SELLER_ROLE },
            sellerWitnessName: { value: "", role: PANDADOC_SELLER_ROLE },
            buyerSig: { value: "", role: PANDADOC_BUYER_ROLE },
            buyerDate: { value: "", role: PANDADOC_BUYER_ROLE },
            buyerWitnessSig: { value: "", role: PANDADOC_BUYER_ROLE },
            buyerWitnessName: { value: "", role: PANDADOC_BUYER_ROLE },
          },
          parse_form_fields: false,
        }),
      );
      const created = await pandaDocRequest(apiKey, "/documents", {
        method: "POST",
        body: form,
      });
      return mapDocument(created);
    },

    async waitUntilDraft(documentId) {
      const deadline = Date.now() + DRAFT_WAIT_MS;
      while (Date.now() < deadline) {
        const details = await this.getDocument(documentId);
        if (details.status === "document.draft") {
          return details;
        }
        if (
          details.status === "document.error" ||
          details.status === "document.voided"
        ) {
          throw new Error(`PandaDoc document entered ${details.status}.`);
        }
        await new Promise((resolve) => setTimeout(resolve, DRAFT_POLL_MS));
      }
      throw new Error("PandaDoc did not finish preparing the document.");
    },

    async sendSilent(documentId) {
      await pandaDocRequest(apiKey, `/documents/${documentId}/send`, {
        method: "POST",
        body: JSON.stringify({ silent: true }),
      });
    },

    async createSession(documentId, recipientEmail) {
      const payload = await pandaDocRequest(
        apiKey,
        `/documents/${documentId}/session`,
        {
          method: "POST",
          body: JSON.stringify({
            recipient: recipientEmail,
            lifetime: 3600,
          }),
        },
      );
      const id = asString(asRecord(payload)?.id);
      if (!id) {
        throw new Error("PandaDoc did not return a signing session.");
      }
      return id;
    },

    async getDocument(documentId) {
      return mapDocument(
        await pandaDocRequest(apiKey, `/documents/${documentId}/details`),
      );
    },

    async downloadProtectedPdf(documentId) {
      const response = await fetch(
        `${API_BASE}/documents/${documentId}/download-protected`,
        {
          headers: { Authorization: `API-Key ${apiKey}` },
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error(
          `PandaDoc download failed (${response.status}).`,
        );
      }
      return Buffer.from(await response.arrayBuffer());
    },
  };
}

export function pandaDocSigningUrl(sessionId: string) {
  return `https://app.pandadoc.com/s/${sessionId}`;
}

export { verifyPandaDocSignature } from "@/lib/pandadoc/verify";

export function recipientRoleFromEmail(
  document: PandaDocDocumentDetails,
  email: string,
) {
  const match = document.recipients.find(
    (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
  );
  return match?.role ?? null;
}
