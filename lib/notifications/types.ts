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
  highlight?: string | null;
}) {
  const body = (input.paragraphs ?? [])
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");
  const highlight = input.highlight?.trim() ?? "";

  if (highlight) {
    return JSON.stringify({ highlight, body });
  }

  return body || input.preview?.trim() || "";
}

export function parseInAppMessage(
  raw: string,
  template?: string,
): { highlight: string | null; message: string } {
  const trimmed = raw.trim();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        highlight?: unknown;
        body?: unknown;
      };

      if (
        typeof parsed.highlight === "string" &&
        typeof parsed.body === "string"
      ) {
        return {
          highlight: parsed.highlight.trim() || null,
          message: parsed.body,
        };
      }
    } catch {
      // Plain text bodies can start with "{" ; fall through.
    }
  }

  if (template === "compliance_update_requested") {
    const blocks = trimmed
      .split(/\n\n+/)
      .map((block) => block.trim())
      .filter(Boolean);

    if (blocks.length >= 2) {
      return {
        highlight: blocks[0] ?? null,
        message: blocks.slice(1).join("\n\n"),
      };
    }
  }

  return { highlight: null, message: raw };
}

export type NotificationPreferences = {
  disabledEmails: string[];
  disabledInApp: string[];
};
