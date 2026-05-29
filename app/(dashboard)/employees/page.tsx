import { redirect } from "next/navigation";

import { DataTable } from "@/components/admin/employees/data-table";
import { resolveBranchOperationsScope } from "@/lib/branch-operations-scope";
import type { EmployeeDirectoryRow } from "@/lib/employees/types";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  const viewerIsSuperAdmin = profile?.user_type === "super_admin";

  const { data: myEmployee } = await supabase
    .from("employees")
    .select("employee_role")
    .eq("user_id", user.id)
    .maybeSingle();

  const viewerIsManager = myEmployee?.employee_role === "manager";

  const { branchId: operationsBranchId, switcherBranches } =
    await resolveBranchOperationsScope();

  let employeeQuery = supabase
    .from("employee_directory")
    .select("*")
    .order("email", { ascending: true });

  if (operationsBranchId) {
    employeeQuery = employeeQuery.contains("branch_ids", [operationsBranchId]);
  }

  const { data: rows, error } = await employeeQuery;

  if (error) {
    console.error(error);
  }

  const branches = switcherBranches.map((b) => ({
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
        variant="branch"
        viewerUserId={user.id}
        viewerIsManager={viewerIsManager}
        viewerIsSuperAdmin={viewerIsSuperAdmin}
      />
    </div>
  );
}
