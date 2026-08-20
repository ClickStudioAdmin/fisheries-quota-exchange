export type InAppNotification = {
  id: number;
  template: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

export function inAppNotificationBody(input: {
  paragraphs?: readonly string[] | null;
  preview?: string | null;
}) {
  const body = (input.paragraphs ?? [])
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");

  return body || input.preview?.trim() || "";
}

export type NotificationPreferences = {
  disabledEmails: string[];
  disabledInApp: string[];
};
