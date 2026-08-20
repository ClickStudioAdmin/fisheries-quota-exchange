import type { AustralianAddress } from "../organisations/address";
import type {
  TransferApplicationPdfData,
  TransferPartyDetails,
} from "./application-data";

export const FDU1465_TEMPLATE_FILENAME = "fdu1465-v09-23.pdf";

const QUOTA_ROWS = [
  { unused: "Unused units", used: "Used units-0", match: /blue swimmer|\bbc1\b/i },
  { unused: "Unused units-0", used: "Used units-1", match: /mud crab east|\bec1\b/i },
  { unused: "Unused units-1", used: "Used units-2", match: /mud crab gulf|\bgc1\b/i },
  { unused: "Unused units-2", used: "Used units-3", match: /spanner crab|\bc2-itq\b|\bc2\b/i },
  { unused: "ECIFF-3", used: "ECIFF-4", match: /grey mackerel|\bgm5\b/i },
  { unused: "ECIFF-6", used: "ECIFF-7", match: /sand whiting|\bwt5\b/i },
  { unused: "ECIFF-9", used: "ECIFF-10", match: /school mackerel|\bscm5\b/i },
  { unused: "ECIFF-12", used: "ECIFF-13", match: /coral trout|\bct line\b/i },
  { unused: "ECIFF-18", used: "ECIFF-19", match: /red throat|\brte\b/i },
  { unused: "ECIFF-21", used: "ECIFF-22", match: /other species|\bos line\b/i },
  {
    unused: "ECIFF-24",
    used: "ECIFF-25",
    match: /spanish mackerel|\bsm units\b|\becsm\b/i,
  },
  { unused: "ECIFF-27", used: "ECIFF-28", match: /northern trawl|trawl region 1/i },
  { unused: "ECIFF-30", used: "ECIFF-31", match: /central trawl|trawl region 2/i },
  {
    unused: "ECIFF-33",
    used: "ECIFF-34",
    match: /southern inshore|trawl region 3/i,
  },
  { unused: "ECIFF-36", used: "ECIFF-37", match: /4a|trawl region 4a/i },
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

export function fduWholeUnits(quantity: string) {
  const trimmed = quantity.trim();
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
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

function partyValues(
  party: TransferPartyDetails,
  fields: {
    surnameOrCompany: string;
    given?: string;
    company?: string;
    individualSurname?: string;
    individualGiven?: string;
    postal: string;
    postalPostcode: string;
    registered: string;
    registeredPostcode: string;
    home: string;
    work: string;
    fax: string;
    mobile: string;
    email: string;
    client: string;
  },
) {
  const values: Record<string, string> = {};
  const company = party.entity_kind === "COMPANY";
  const postal = fduAddressParts(postalAddress(party));
  const registered = fduAddressParts(party.registered_address);
  const person = fduPersonName(party.legal_name);

  if (fields.surnameOrCompany) {
    values[fields.surnameOrCompany] = company
      ? party.legal_name
      : person.surname;
  }
  if (fields.given && !company) {
    values[fields.given] = person.given;
  }
  if (fields.company && company) {
    values[fields.company] = party.legal_name;
  }
  if (fields.individualSurname && !company) {
    values[fields.individualSurname] = person.surname;
    if (fields.individualGiven) {
      values[fields.individualGiven] = person.given;
    }
  }

  values[fields.postal] = postal.text;
  values[fields.postalPostcode] = postal.postcode;
  values[fields.registered] = registered.text;
  values[fields.registeredPostcode] = registered.postcode;
  values[fields.mobile] = party.mobile ?? "";
  values[fields.client] = party.profile?.client_reference ?? "";
  values[fields.home] = "";
  values[fields.work] = "";
  values[fields.fax] = "";
  values[fields.email] = "";
  return values;
}

export function fdu1465FieldValues(data: TransferApplicationPdfData) {
  const values = {
    ...partyValues(data.seller, {
      surnameOrCompany: "Textfield-2",
      given: "Textfield-3",
      postal: "Text10",
      postalPostcode: "Text12",
      registered: "Text13",
      registeredPostcode: "Text14",
      home: "Textfield-4",
      work: "Textfield-5",
      fax: "Textfield-6",
      mobile: "Textfield-7",
      email: "Textfield-8",
      client: "Textfield-9",
    }),
    ...partyValues(data.buyer, {
      surnameOrCompany: "",
      company: "Textfield-19",
      individualSurname: "Textfield-10",
      individualGiven: "Textfield-11",
      postal: "Text6",
      postalPostcode: "Text7",
      registered: "Text8",
      registeredPostcode: "Text9",
      home: "Textfield-20",
      work: "Textfield-21",
      fax: "Textfield-22",
      mobile: "Textfield-23",
      email: "Textfield-24",
      client: "Textfield-25",
    }),
  };

  const quota = matchFdu1465QuotaRow(
    `${data.fisheryName} ${data.quotaTypeName} ${data.unitLabel}`,
  );
  if (quota) {
    values[quota.unused] = fduWholeUnits(data.quantity);
  }

  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value.trim().length > 0),
  );
}
