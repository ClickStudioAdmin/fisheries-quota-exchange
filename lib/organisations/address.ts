export const AU_STATES = [
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NSW", name: "New South Wales" },
  { code: "NT", name: "Northern Territory" },
  { code: "QLD", name: "Queensland" },
  { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "VIC", name: "Victoria" },
  { code: "WA", name: "Western Australia" },
] as const;

export type AustralianStateCode = (typeof AU_STATES)[number]["code"];

export type AustralianAddress = {
  line1: string;
  line2: string | null;
  suburb: string;
  state: AustralianStateCode;
  postcode: string;
};

export function isAustralianStateCode(
  value: string,
): value is AustralianStateCode {
  return AU_STATES.some((state) => state.code === value);
}

export function parseAustralianAddress(value: unknown): AustralianAddress | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const line1 = typeof row.line1 === "string" ? row.line1.trim() : "";
  const line2 =
    typeof row.line2 === "string" && row.line2.trim() ? row.line2.trim() : null;
  const suburb = typeof row.suburb === "string" ? row.suburb.trim() : "";
  const state = typeof row.state === "string" ? row.state.trim().toUpperCase() : "";
  const postcode = typeof row.postcode === "string" ? row.postcode.trim() : "";

  if (!line1 && !suburb && !state && !postcode) {
    return null;
  }

  if (!isAustralianStateCode(state)) {
    return null;
  }

  return { line1, line2, suburb, state, postcode };
}

export function australianAddressIsComplete(
  address: AustralianAddress | null | undefined,
) {
  return Boolean(
    address &&
      address.line1.trim() &&
      address.suburb.trim() &&
      isAustralianStateCode(address.state) &&
      /^\d{4}$/.test(address.postcode),
  );
}

export function formatAustralianAddress(
  address: AustralianAddress | null | undefined,
) {
  if (!address) {
    return "";
  }

  const street = [address.line1.trim(), address.line2?.trim()]
    .filter(Boolean)
    .join(", ");
  const locality = [address.suburb.trim(), address.state, address.postcode]
    .filter(Boolean)
    .join(" ");
  return [street, locality].filter(Boolean).join(", ");
}

export function readAustralianAddress(
  formData: FormData,
  prefix: string,
): { address: AustralianAddress } | { error: string } | { address: null } {
  const line1 = String(formData.get(`${prefix}_line1`) ?? "").trim();
  const line2 = String(formData.get(`${prefix}_line2`) ?? "").trim();
  const suburb = String(formData.get(`${prefix}_suburb`) ?? "").trim();
  const state = String(formData.get(`${prefix}_state`) ?? "")
    .trim()
    .toUpperCase();
  const postcode = String(formData.get(`${prefix}_postcode`) ?? "")
    .replace(/\s/g, "");

  if (!line1 && !line2 && !suburb && !state && !postcode) {
    return { address: null };
  }

  const label = prefix === "postal" ? "Postal address" : "Registered address";

  if (!line1) {
    return { error: `${label}: street address is required.` };
  }

  if (!suburb) {
    return { error: `${label}: suburb is required.` };
  }

  if (!isAustralianStateCode(state)) {
    return { error: `${label}: choose an Australian state or territory.` };
  }

  if (!/^\d{4}$/.test(postcode)) {
    return { error: `${label}: postcode must be 4 digits.` };
  }

  return {
    address: {
      line1,
      line2: line2 || null,
      suburb,
      state,
      postcode,
    },
  };
}
