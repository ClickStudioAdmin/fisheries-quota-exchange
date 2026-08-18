import type { ProductEmailId } from "@/lib/email/product-emails";

export type NoticeEmailData = {
  subject: string;
  preview: string;
  heading: string;
  paragraphs: string[];
  actionLabel?: string;
  actionUrl?: string;
};

export type EmailTemplates = Record<ProductEmailId, NoticeEmailData>;

export type EmailTemplate = ProductEmailId;

export type SendEmailResult =
  | { sent: true }
  | { sent: false; skipped: true }
  | { sent: false; skipped?: false; error: string };
