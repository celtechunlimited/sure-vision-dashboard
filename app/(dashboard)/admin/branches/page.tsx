import { DataTable } from "@/components/admin/branches/data-table";
import { listBranchesForAdmin } from "@/lib/actions/branch-actions";

export default async function AdminBranchesPage() {
  const branches = await listBranchesForAdmin();

  return (
    <div className="flex flex-1 flex-col py-4">
      <DataTable data={branches} />
    </div>
  );
}
