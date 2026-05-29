import { redirect } from "next/navigation";

import { InventorySnapshot } from "@/components/branch/dashboard/inventory-snapshot";
import { LowStockAlerts } from "@/components/branch/dashboard/low-stock-alerts";
import { PendingAppointmentsSection } from "@/components/branch/dashboard/pending-appointments-section";
import { QueueStatCounters } from "@/components/branch/dashboard/queue-stat-counters";
import { RecentStockMovements } from "@/components/branch/dashboard/recent-stock-movements";
import { TodaysQueue } from "@/components/branch/dashboard/todays-queue";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { resolveBranchOperationsScope } from "@/lib/branch-operations-scope";
import { todayRange } from "@/lib/dashboard/date-range";
import type { AppointmentRow, DispensedItemRow } from "@/lib/appointments/types";
import type { ProductInventoryRow } from "@/lib/products/types";
import type { StockMovementLineRow } from "@/lib/stock-movements/types";
import { createClient } from "@/lib/supabase/server";

function dedupeAppointmentsById(rows: AppointmentRow[]): AppointmentRow[] {
  return [...new Map(rows.map((r) => [r.id, r])).values()];
}

export default async function BranchDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { branchId: operationsBranchId, switcherBranches } =
    await resolveBranchOperationsScope();

  if (!operationsBranchId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-lg font-semibold">No branch assigned</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your account is not linked to an active branch. Contact an administrator.
        </p>
      </div>
    );
  }

  const branchMeta = switcherBranches.find((b) => b.id === operationsBranchId);
  const branchTitle =
    branchMeta?.long_name ?? branchMeta?.short_name ?? "Branch dashboard";

  const { startIso, endIso } = todayRange();

  const [queueRes, pendingRes, lowRes, invRes, movRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .eq("branch_id", operationsBranchId)
      .gte("start_time", startIso)
      .lt("start_time", endIso)
      .order("start_time", { ascending: true }),
    supabase
      .from("appointments")
      .select("*")
      .eq("branch_id", operationsBranchId)
      .eq("status", "pending")
      .order("start_time", { ascending: true, nullsFirst: false }),
    supabase
      .from("product_inventory")
      .select("*")
      .eq("branch_id", operationsBranchId)
      .eq("is_active", true)
      .in("stock_status", ["low_stock", "out_of_stock"]),
    supabase
      .from("product_inventory")
      .select("category, stock_status")
      .eq("branch_id", operationsBranchId)
      .eq("is_active", true),
    supabase
      .from("stock_movement_lines")
      .select("*")
      .eq("branch_id", operationsBranchId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (queueRes.error) console.error(queueRes.error);
  if (pendingRes.error) console.error(pendingRes.error);
  if (lowRes.error) console.error(lowRes.error);
  if (invRes.error) console.error(invRes.error);
  if (movRes.error) console.error(movRes.error);

  const queue = (queueRes.data ?? []) as AppointmentRow[];
  const pending = (pendingRes.data ?? []) as AppointmentRow[];
  const lowStock = (lowRes.data ?? []) as ProductInventoryRow[];
  const inventoryCategories = (invRes.data ?? []) as {
    category: ProductInventoryRow["category"];
    stock_status: ProductInventoryRow["stock_status"];
  }[];
  const movements = (movRes.data ?? []) as StockMovementLineRow[];

  const pendingIds = pending.map((p) => p.id);
  const dispensedByPendingAppointment: Record<string, DispensedItemRow[]> = {};
  if (pendingIds.length > 0) {
    const { data: dispensedRows, error: dErr } = await supabase
      .from("dispensed_items")
      .select("*")
      .in("appointment_id", pendingIds);
    if (dErr) console.error(dErr);
    for (const row of (dispensedRows ?? []) as DispensedItemRow[]) {
      const aid = row.appointment_id;
      if (!aid) continue;
      if (!dispensedByPendingAppointment[aid]) {
        dispensedByPendingAppointment[aid] = [];
      }
      dispensedByPendingAppointment[aid].push(row);
    }
  }

  const statsAppointments = dedupeAppointmentsById([...pending, ...queue]);

  return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{branchTitle}</h1>
              <p className="text-sm text-muted-foreground">
                Operational overview · refresh for latest data
              </p>
            </div>
            <RefreshButton />
          </div>

          <div className="flex flex-col gap-4 px-4 lg:px-6">
            <QueueStatCounters appointments={statsAppointments} />

            <div className="grid min-h-0 gap-4 lg:grid-cols-3">
              <div className="flex min-h-0 flex-col gap-4 lg:col-span-2">
                <PendingAppointmentsSection
                  appointments={pending}
                  dispensedByAppointment={dispensedByPendingAppointment}
                />
                <TodaysQueue appointments={queue} />
              </div>
              <div className="flex min-h-0 flex-col gap-4">
                <LowStockAlerts products={lowStock} />
                <InventorySnapshot categoryRows={inventoryCategories} />
                <RecentStockMovements rows={movements} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
