export const SIGNING_CHANNELS = ["OFFLINE", "PANDADOC"] as const;

export type SigningChannel = (typeof SIGNING_CHANNELS)[number];

export function isSigningChannel(value: unknown): value is SigningChannel {
  return (
    typeof value === "string" &&
    (SIGNING_CHANNELS as readonly string[]).includes(value)
  );
}

export function parseSigningChannel(value: unknown): SigningChannel | null {
  return isSigningChannel(value) ? value : null;
}

export function signingChannelLabel(channel: SigningChannel) {
  return channel === "PANDADOC" ? "Sign online" : "Offline pack";
}

export function isPandadocChannel(
  channel: SigningChannel | string | null | undefined,
) {
  return channel === "PANDADOC";
}
