import { headers } from "next/headers";

export async function getSiteUrl() {
  const headerList = await headers();
  const origin = headerList.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return null;
  }

  return `${protocol}://${host}`;
}
