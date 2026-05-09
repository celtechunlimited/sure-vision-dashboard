import type { PatientDirectoryRow } from "@/lib/patients/types";

export function patientDirectoryFullName(p: PatientDirectoryRow): string {
  const parts = [p.first_name, p.middle_name, p.last_name].filter(
    (x): x is string => Boolean(x && String(x).trim()),
  );
  const name = parts.join(" ").trim();
  return name || "Unnamed patient";
}
