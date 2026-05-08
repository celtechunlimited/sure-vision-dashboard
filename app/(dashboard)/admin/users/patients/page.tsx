import { DataTable } from "@/components/admin/patients/data-table";
import type { PatientAccountStatus, PatientDirectoryRow } from "@/lib/patients/types";
import { createClient } from "@/lib/supabase/server";

function normalizeAccountStatus(
  raw: string | null | undefined,
): PatientAccountStatus {
  if (raw === "active" || raw === "inactive" || raw === "no_account") {
    return raw;
  }
  return "no_account";
}

export default async function AdminUsersPatientsPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("patient_directory")
    .select("*")
    .order("patient_created_at", { ascending: false });

  if (error) {
    console.error(error);
  }

  const data: PatientDirectoryRow[] = (rows ?? []).map((r) => ({
    ...(r as PatientDirectoryRow),
    account_status: normalizeAccountStatus(
      (r as { account_status?: string }).account_status,
    ),
  }));

  return (
    <div className="flex flex-1 flex-col py-4">
      <DataTable data={data} />
    </div>
  );
}
