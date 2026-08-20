export const SELECTABLE_JURISDICTION_CODES = ["QLD"] as const;

const JURISDICTION_SELECT_ORDER = [
  "QLD",
  "NSW",
  "ACT",
  "NT",
  "SA",
  "TAS",
  "VIC",
  "WA",
  "CTH",
] as const;

function jurisdictionSelectRank(code: string) {
  const index = JURISDICTION_SELECT_ORDER.indexOf(
    code as (typeof JURISDICTION_SELECT_ORDER)[number],
  );
  return index >= 0 ? index : JURISDICTION_SELECT_ORDER.length;
}

export function sortJurisdictionsForSelect<
  T extends { code: string; name: string },
>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const rank = jurisdictionSelectRank(left.code) - jurisdictionSelectRank(right.code);
    if (rank !== 0) {
      return rank;
    }

    return left.name.localeCompare(right.name);
  });
}

export function isSelectableJurisdictionCode(code: string) {
  return (SELECTABLE_JURISDICTION_CODES as readonly string[]).includes(code);
}

export function parseEnabledJurisdictionCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) => String(item).trim().toUpperCase())
        .filter((code) => code.length > 0),
    ),
  ];
}

export function enabledJurisdictionCodesFromForm(formData: FormData): string[] {
  return parseEnabledJurisdictionCodes(formData.getAll("jurisdiction_code")).filter(
    isSelectableJurisdictionCode,
  );
}

export function organisationEnablesJurisdiction(
  codes: readonly string[] | null | undefined,
  code: string,
) {
  return (codes ?? []).includes(code);
}
