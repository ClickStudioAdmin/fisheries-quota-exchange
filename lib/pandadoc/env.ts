export function getPandaDocEnv(): {
  apiKey: string;
  webhookSharedKey: string;
} | null {
  const apiKey = process.env.PANDADOC_API_KEY?.trim();
  const webhookSharedKey = process.env.PANDADOC_WEBHOOK_SHARED_KEY?.trim();

  if (!apiKey || !webhookSharedKey) {
    return null;
  }

  return { apiKey, webhookSharedKey };
}

export function isPandaDocConfigured() {
  return getPandaDocEnv() !== null;
}
