import { redirect } from "next/navigation";

import { RefreshButton } from "@/components/dashboard/refresh-button";
import {
  AppointmentsStatusCards,
  type AdminAppointmentTodayRow,
} from "@/components/admin/dashboard/appointments-status-cards";
import {
  InventoryAlertsByBranch,
  type LowStockInventoryRow,
} from "@/components/admin/dashboard/inventory-alerts-by-branch";
import {
  TopDispensedProducts,
  type DispensedDashboardRow,
} from "@/components/admin/dashboard/top-dispensed-products";
import type { BranchRow } from "@/lib/branches/types";
import { todayRange, weekRangeContaining } from "@/lib/dashboard/date-range";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { startIso, endIso } = todayRange();
  const { weekStartIso, weekEndIso } = weekRangeContaining();

  const [brRes, apptRes, lowRes, dispRes] = await Promise.all([
    supabase
      .from("branches")
      .select("id, short_name, long_name")
      .eq("is_active", true)
      .order("short_name", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, branch_id, status")
      .gte("start_time", startIso)
      .lt("start_time", endIso),
    supabase
      .from("product_inventory")
      .select(
        "id, branch_id, short_name, sku, category, current_stock, low_stock_threshold, stock_status",
      )
      .in("stock_status", ["low_stock", "out_of_stock"])
      .eq("is_active", true),
    supabase
      .from("dispensed_items")
      .select("product_sku, product_name, quantity, created_at")
      .gte("created_at", weekStartIso)
      .lt("created_at", weekEndIso),
  ]);

  if (brRes.error) console.error(brRes.error);
  if (apptRes.error) console.error(apptRes.error);
  if (lowRes.error) console.error(lowRes.error);
  if (dispRes.error) console.error(dispRes.error);

  const branches = (brRes.data ?? []) as BranchRow[];
  const appointments = (apptRes.data ?? []) as AdminAppointmentTodayRow[];
  const lowStockRows = (lowRes.data ?? []) as LowStockInventoryRow[];
  const dispensedRows = (dispRes.data ?? []) as DispensedDashboardRow[];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Administration dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Multi-branch performance overview
              </p>
            </div>
            <RefreshButton />
          </div>

          <div className="flex flex-col gap-4 px-4 lg:px-6">
            <AppointmentsStatusCards appointments={appointments} />
            <InventoryAlertsByBranch
              branches={branches}
              lowStockRows={lowStockRows}
            />
            <TopDispensedProducts
              dispensedRows={dispensedRows}
              todayStartIso={startIso}
              todayEndIso={endIso}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
