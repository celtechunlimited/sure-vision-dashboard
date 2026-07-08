import type { PatientDirectoryRow } from "@/lib/patients/types";
import { formatPatientName } from "@/lib/patients/format-name";

export function patientDirectoryFullName(p: PatientDirectoryRow): string {
  return formatPatientName(p, "Unnamed patient");
}
