export type InAppNotification = {
  id: number;
  template: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreferences = {
  disabledEmails: string[];
  disabledInApp: string[];
};
