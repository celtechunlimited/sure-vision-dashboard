import { redirect } from "next/navigation";

import { DataTable } from "@/components/stock-movements/data-table";
import { resolveBranchOperationsScope } from "@/lib/branch-operations-scope";
import type { StockMovementLineRow } from "@/lib/stock-movements/types";
import { createClient } from "@/lib/supabase/server";

export default async function InventoryStockMovementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { branchId: operationsBranchId } = await resolveBranchOperationsScope();

  let q = supabase
    .from("stock_movement_lines")
    .select("*")
    .order("created_at", { ascending: false });

  if (operationsBranchId) {
    q = q.eq("branch_id", operationsBranchId);
  }

  const { data: rows, error } = await q;
  if (error) console.error(error);

  return (
    <div className="flex flex-1 flex-col py-4">
      <DataTable data={(rows ?? []) as StockMovementLineRow[]} />
    </div>
  );
}
