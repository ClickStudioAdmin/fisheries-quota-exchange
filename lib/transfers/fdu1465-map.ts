import type { AustralianAddress } from "../organisations/address";
import type {
  TransferApplicationPdfData,
  TransferPartyDetails,
} from "./application-data";

export const FDU1465_TEMPLATE_FILENAME = "fdu1465-v09-23.pdf";

const QUOTA_ROWS = [
  { unused: "Unused units", used: "Used units-0", match: /blue swimmer|\bbc1-itq\b|\bbc1\b/i },
  { unused: "Unused units-0", used: "Used units-1", match: /mud crab east|\bec1-itq\b|\bec1\b/i },
  { unused: "Unused units-1", used: "Used units-2", match: /mud crab gulf|\bgc1-itq\b|\bgc1\b/i },
  { unused: "Unused units-2", used: "Used units-3", match: /spanner crab|\bc2-itq\b|\bc2\b/i },
  { unused: "ECIFF-3", used: "ECIFF-4", match: /grey mackerel region 5|\bgm5-itq\b|\bgm5\b/i },
  { unused: "ECIFF-6", used: "ECIFF-7", match: /sand whiting|\bwt5-itq\b|\bwt5\b/i },
  { unused: "ECIFF-9", used: "ECIFF-10", match: /school mackerel|\bscm5-itq\b|\bscm5\b/i },
  { unused: "ECIFF-12", used: "ECIFF-13", match: /coral trout|\bct line\b/i },
  { unused: "ECIFF-18", used: "ECIFF-19", match: /red throat|\brte\b/i },
  { unused: "ECIFF-21", used: "ECIFF-22", match: /other species|\bos line\b/i },
  {
    unused: "ECIFF-24",
    used: "ECIFF-25",
    match: /spanish mackerel|\bsm units\b|\becsm\b/i,
  },
  {
    unused: "ECIFF-27",
    used: "ECIFF-28",
    match: /northern trawl region 1|norther trawl|trawl region 1/i,
  },
  {
    unused: "ECIFF-30",
    used: "ECIFF-31",
    match: /northern trawl region 2|central trawl|trawl region 2/i,
  },
  {
    unused: "ECIFF-33",
    used: "ECIFF-34",
    match: /southern inshore|trawl region 3/i,
  },
  { unused: "ECIFF-36", used: "ECIFF-37", match: /region 4a|trawl region 4a/i },
  { unused: "Bechdemer-0", used: "Bechdemer-1", match: /black teatfish|\bb1b\b/i },
  { unused: "Bechdemer-3", used: "Bechdemer-4", match: /other beche|\bb1o\b/i },
  { unused: "Bechdemer-6", used: "Bechdemer-7", match: /white teatfish|\bb1w\b/i },
  { unused: "Coral-0", used: "Coral-1", match: /other coral|\bdo-itq\b/i },
  { unused: "Coral-3", used: "Coral-4", match: /specialty coral|\bds-itq\b/i },
  { unused: "Shell Grit-0", used: "Shell Grit-1", match: /shell grit|\bg-itq\b/i },
  { unused: "Trochus-0", used: "Trochus-1", match: /trochus|\bj1\b/i },
  {
    unused: "Tropical Rock Lobster",
    used: "Tropical Rock Lobster-0",
    match: /rock lobster|\br-itq\b/i,
  },
] as const;

export function fduWholeUnits(quantity: string | number | null | undefined) {
  const trimmed = String(quantity ?? "").trim();
  const value = Number(trimmed);
  if (!trimmed || !Number.isFinite(value)) {
    return trimmed;
  }
  if (Math.abs(value - Math.round(value)) < 1e-9) {
    return String(Math.round(value));
  }
  return trimmed;
}

export function fduAddressParts(address: AustralianAddress | null | undefined) {
  if (!address) {
    return { text: "", postcode: "" };
  }

  const street = [address.line1.trim(), address.line2?.trim()]
    .filter(Boolean)
    .join(", ");
  const text = [street, address.suburb.trim(), address.state]
    .filter(Boolean)
    .join(", ");
  return { text, postcode: address.postcode.trim() };
}

export function fduPersonName(legalName: string) {
  const parts = legalName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { surname: parts[0] ?? "", given: "" };
  }
  return {
    surname: parts[parts.length - 1] ?? "",
    given: parts.slice(0, -1).join(" "),
  };
}

function fduDateOfBirth(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value?.trim() ?? "");
  if (!match) {
    return "";
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function matchFdu1465QuotaRow(haystack: string) {
  const text = haystack.trim();
  if (!text) {
    return null;
  }
  return QUOTA_ROWS.find((row) => row.match.test(text)) ?? null;
}

function postalAddress(party: TransferPartyDetails) {
  if (party.postal_same_as_registered) {
    return party.registered_address;
  }
  return party.postal_address ?? party.registered_address;
}

export function partyFieldValues(
  party: TransferPartyDetails,
  fields: {
    individualSurname?: string;
    individualGiven?: string;
    individualDob?: string;
    companyName?: string;
    postal: string;
    postalPostcode: string;
    registered: string;
    registeredPostcode: string;
    mobile: string;
    email?: string;
    client: string;
  },
) {
  const values: Record<string, string> = {};
  const company = party.entity_kind === "COMPANY";
  const individual = party.entity_kind === "INDIVIDUAL";
  const postal = fduAddressParts(postalAddress(party));
  const registered = fduAddressParts(party.registered_address);
  const person = fduPersonName(party.legal_name);

  if (individual) {
    if (fields.individualSurname) {
      values[fields.individualSurname] = person.surname;
    }
    if (fields.individualGiven) {
      values[fields.individualGiven] = person.given;
    }
    if (fields.individualDob && party.date_of_birth) {
      values[fields.individualDob] = fduDateOfBirth(party.date_of_birth);
    }
  }
  if (company && fields.companyName) {
    values[fields.companyName] = party.legal_name;
  }

  if (fields.postal) {
    values[fields.postal] = postal.text;
  }
  if (fields.postalPostcode) {
    values[fields.postalPostcode] = postal.postcode;
  }
  if (fields.registered) {
    values[fields.registered] = fields.registeredPostcode
      ? registered.text
      : [registered.text, registered.postcode].filter(Boolean).join(" ");
  }
  if (fields.registeredPostcode) {
    values[fields.registeredPostcode] = registered.postcode;
  }
  if (fields.mobile) {
    values[fields.mobile] = party.mobile ?? "";
  }
  if (fields.email) {
    values[fields.email] = party.email ?? "";
  }
  if (fields.client) {
    values[fields.client] = party.profile?.client_reference ?? "";
  }
  return values;
}

export function fdu1465FieldValues(data: TransferApplicationPdfData) {
  const values = {
    ...partyFieldValues(data.seller, {
      individualSurname: "Textfield-0",
      individualGiven: "Textfield-1",
      companyName: "Textfield-2",
      postal: "Text10",
      postalPostcode: "Text12",
      registered: "Text13",
      registeredPostcode: "Text14",
      mobile: "Textfield-7",
      email: "Textfield-8",
      client: "Textfield-9",
    }),
    ...partyFieldValues(data.buyer, {
      individualSurname: "Textfield-10",
      individualGiven: "Textfield-11",
      individualDob: "Textfield-12",
      companyName: "Textfield-19",
      postal: "Text6",
      postalPostcode: "Text7",
      registered: "Text8",
      registeredPostcode: "Text9",
      mobile: "Textfield-23",
      email: "Textfield-24",
      client: "Textfield-25",
    }),
  };

  const quota = matchFdu1465QuotaRow(
    `${data.fisheryName} ${data.quotaTypeName} ${data.unitLabel}`,
  );
  if (quota) {
    values[quota.unused] = fduWholeUnits(data.unusedQuantity || data.quantity);
    values[quota.used] = fduWholeUnits(data.usedQuantity);
  }

  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value.trim().length > 0),
  );
}

export const FDU1469_TEMPLATE_FILENAME = "fdu1469-v02-26.pdf";

const LEASE_QUOTA_ROWS = [
  { unused: "Unused units-0", match: /blue swimmer|\bbc1\b/i },
  { unused: "Unused units-1", match: /mud crab east|\bec1\b/i },
  { unused: "Unused units-2", match: /mud crab gulf|\bgc1\b/i },
  { unused: "Unused units-3", match: /spanner crab|\bc2-itq\b|\bc2\b/i },
  { unused: "Text12", match: /coral trout|\bct line\b/i },
  { unused: "Text13", match: /red throat|\brte\b/i },
  { unused: "Text14", match: /other species|\bos line\b/i },
  {
    unused: "Text15",
    match: /spanish mackerel|\bsm units\b|\becsm\b/i,
  },
  { unused: "Text16", match: /northern trawl region 1|norther trawl/i },
  { unused: "Text17", match: /northern trawl region 2|central trawl/i },
  { unused: "Text18", match: /southern inshore/i },
  { unused: "Trawl  T4-0", match: /region a|4a|offshore trawl region a/i },
  { unused: "Trawl-10", match: /region b|4b|offshore trawl region b/i },
  { unused: "Trawl-8", match: /moreton/i },
  { unused: "Trawl-6", match: /t4-itq|prescribed whiting|\bt4\b/i },
  { unused: "Trawl-4", match: /grey mackerel region 5|\bgm5-itq\b|\bgm5\b/i },
  { unused: "Trawl-2", match: /sand whiting|\bwt5\b/i },
  { unused: "Trawl-0", match: /school mackerel|\bscm5\b/i },
  { unused: "Bechdemer-0", match: /black teatfish|\bb1b\b/i },
  { unused: "Bechdemer-2", match: /other beche|\bb1o\b/i },
  { unused: "Bechdemer-4", match: /white teatfish|\bb1w\b/i },
  { unused: "Coral-2", match: /other coral|\bdo-itq\b/i },
  { unused: "Coral-0", match: /specialty coral|\bds-itq\b/i },
  { unused: "Shell Grit-0", match: /shell grit|\bg-itq\b/i },
] as const;

export function matchFdu1469QuotaRow(haystack: string) {
  const text = haystack.trim();
  if (!text) {
    return null;
  }
  return LEASE_QUOTA_ROWS.find((row) => row.match.test(text)) ?? null;
}

export function fdu1469FieldValues(data: TransferApplicationPdfData) {
  const values = {
    ...partyFieldValues(data.seller, {
      individualSurname: "Textfield-1",
      individualGiven: "Textfield-2",
      companyName: "Textfield-3",
      postal: "Text2",
      postalPostcode: "Text3",
      registered: "Text4",
      registeredPostcode: "",
      mobile: "Textfield-8",
      email: "Textfield-9",
      client: "Textfield-10",
    }),
    ...partyFieldValues(data.buyer, {
      individualSurname: "Textfield-11",
      individualGiven: "Textfield-12",
      individualDob: "Textfield-13",
      companyName: "Textfield-20",
      postal: "Text7",
      postalPostcode: "Text9",
      registered: "",
      registeredPostcode: "",
      mobile: "Textfield-24",
      email: "Textfield-25",
      client: "Textfield-26",
    }),
  };

  const quota = matchFdu1469QuotaRow(
    `${data.fisheryName} ${data.quotaTypeName} ${data.unitLabel}`,
  );
  if (quota) {
    values[quota.unused] = fduWholeUnits(data.unusedQuantity || data.quantity);
  }

  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value.trim().length > 0),
  );
}
