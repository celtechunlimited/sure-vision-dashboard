export type PatientNameParts = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
};

export function formatPatientName(
  patient: PatientNameParts,
  fallback = "—",
): string {
  const first = patient.first_name?.trim();
  const middle = patient.middle_name?.trim();
  const last = patient.last_name?.trim();

  const firstPart = [first, middle].filter(Boolean).join(" ");

  if (last && firstPart) {
    return `${last}, ${firstPart}`;
  }
  if (last) {
    return last;
  }
  if (firstPart) {
    return firstPart;
  }
  return fallback;
}

export function patientNameSortKey(patient: PatientNameParts): string {
  const last = patient.last_name?.trim()?.toLowerCase() ?? "";
  const first = patient.first_name?.trim()?.toLowerCase() ?? "";
  const middle = patient.middle_name?.trim()?.toLowerCase() ?? "";
  return [last, first, middle].filter(Boolean).join("\0");
}
