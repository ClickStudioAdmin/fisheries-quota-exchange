export type EmailTemplates = {
  member_added: {
    accountName: string;
    role: string;
    registerUrl: string;
    loginUrl: string;
  };
};

export type EmailTemplate = keyof EmailTemplates;

export type SendEmailResult =
  | { sent: true }
  | { sent: false; skipped: true }
  | { sent: false; skipped?: false; error: string };
