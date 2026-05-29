import { DataTable } from "@/components/admin/employees/data-table";
import { listBranchesForAdmin } from "@/lib/actions/branch-actions";
import type { EmployeeDirectoryRow } from "@/lib/employees/types";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersEmployeesPage() {
  const supabase = await createClient();
  const [{ data: rows, error }, branchRows] = await Promise.all([
    supabase
      .from("employee_directory")
      .select("*")
      .order("email", { ascending: true }),
    listBranchesForAdmin(),
  ]);

  if (error) {
    console.error(error);
  }

  const branches = (branchRows ?? []).map((b) => ({
    id: b.id,
    short_name: b.short_name,
    long_name: b.long_name,
  }));

  return (
    <div className="flex flex-1 flex-col py-4">
      <DataTable
        data={(rows ?? []).map((r) => ({
          ...(r as EmployeeDirectoryRow),
          branch_ids: (r as { branch_ids?: string[] | null }).branch_ids ?? [],
          branch_short_names:
            (r as { branch_short_names?: string[] | null }).branch_short_names ??
            [],
          branch_long_names:
            (r as { branch_long_names?: string[] | null }).branch_long_names ??
            [],
        }))}
        branches={branches}
      />
    </div>
  );
}
