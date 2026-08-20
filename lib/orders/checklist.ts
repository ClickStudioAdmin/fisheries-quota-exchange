export function parseComplianceChecklist(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ),
    ),
  ];
}

export function selectedComplianceChecks(
  processChecks: readonly string[],
  submitted: readonly string[],
) {
  const chosen = new Set(submitted);
  return processChecks.filter((item) => chosen.has(item));
}
