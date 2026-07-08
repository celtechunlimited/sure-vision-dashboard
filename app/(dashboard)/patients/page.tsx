import { redirect } from "next/navigation";

import { DataTable } from "@/components/admin/patients/data-table";
import { getSessionUserType } from "@/lib/actions/auth-actions";
import { resolveBranchOperationsScope } from "@/lib/branch-operations-scope";
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

export default async function PatientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { branchId: operationsBranchId, switcherBranches } =
    await resolveBranchOperationsScope();

  const userType = await getSessionUserType();
  const isSuperAdmin = userType === "super_admin";

  let patientQuery = supabase
    .from("patient_directory")
    .select("*")
    .order("patient_created_at", { ascending: false });

  if (operationsBranchId) {
    patientQuery = patientQuery.contains("branch_ids", [operationsBranchId]);
  }

  const { data: rows, error } = await patientQuery;

  let deletedData: PatientDirectoryRow[] = [];
  if (isSuperAdmin) {
    let deletedQuery = supabase
      .from("patient_directory_deleted")
      .select("*")
      .order("deleted_at", { ascending: false });

    if (operationsBranchId) {
      deletedQuery = deletedQuery.contains("branch_ids", [operationsBranchId]);
    }

    const { data: deletedRows, error: deletedError } = await deletedQuery;
    if (deletedError) {
      console.error(deletedError);
    }
    deletedData = (deletedRows ?? []).map((r) =>
      normalizePatientRow(r as Record<string, unknown>),
    );
  }

  if (error) {
    console.error(error);
  }

  const data = (rows ?? []).map((r) =>
    normalizePatientRow(r as Record<string, unknown>),
  );

  const currentBranch = switcherBranches.find((b) => b.id === operationsBranchId);

  return (
    <div className="flex flex-1 flex-col py-4">
      <DataTable
        data={data}
        deletedData={deletedData}
        variant="branch"
        autoAssignBranchId={operationsBranchId}
        autoAssignBranchLabel={currentBranch?.long_name ?? null}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
