export const SELECTABLE_JURISDICTION_CODES = ["QLD"] as const;

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
