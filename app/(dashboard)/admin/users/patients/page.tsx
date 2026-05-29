import { DataTable } from "@/components/admin/patients/data-table";
import { listBranchesForAdmin } from "@/lib/actions/branch-actions";
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

function normalizePatientRow(raw: Record<string, unknown>): PatientDirectoryRow {
  return {
    ...(raw as PatientDirectoryRow),
    account_status: normalizeAccountStatus(
      raw.account_status as string | undefined,
    ),
    branch_ids: (raw.branch_ids as string[] | null) ?? [],
    branch_short_names: (raw.branch_short_names as string[] | null) ?? [],
    branch_long_names: (raw.branch_long_names as string[] | null) ?? [],
  };
}

export default async function AdminUsersPatientsPage() {
  const supabase = await createClient();
  const [{ data: rows, error }, branchRows] = await Promise.all([
    supabase
      .from("patient_directory")
      .select("*")
      .order("patient_created_at", { ascending: false }),
    listBranchesForAdmin(),
  ]);

  if (error) {
    console.error(error);
  }

  const data = (rows ?? []).map((r) =>
    normalizePatientRow(r as Record<string, unknown>),
  );

  const branches = (branchRows ?? []).map((b) => ({
    id: b.id,
    short_name: b.short_name,
    long_name: b.long_name,
  }));

  return (
    <div className="flex flex-1 flex-col py-4">
      <DataTable data={data} branches={branches} />
    </div>
  );
}
