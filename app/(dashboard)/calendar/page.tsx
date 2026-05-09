import { redirect } from "next/navigation";

import { CalendarClient } from "@/components/calendar/calendar-client";
import { resolveBranchOperationsScope } from "@/lib/branch-operations-scope";
import { parseBranchOperatingDayWindow } from "@/lib/calendar/utils";
import type { AppointmentRow, DispensedItemRow } from "@/lib/appointments/types";
import type { PatientDirectoryRow } from "@/lib/patients/types";
import type { ProductInventoryRow } from "@/lib/products/types";
import { createClient } from "@/lib/supabase/server";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { branchId: operationsBranchId } =
    await resolveBranchOperationsScope();

  let operatingDayWindow = parseBranchOperatingDayWindow(null);
  if (operationsBranchId) {
    const { data: branchRow, error: brErr } = await supabase
      .from("branches")
      .select("operating_hours")
      .eq("id", operationsBranchId)
      .maybeSingle();
    if (brErr) console.error(brErr);
    operatingDayWindow = parseBranchOperatingDayWindow(
      branchRow?.operating_hours,
    );
  }

  let apptQuery = supabase
    .from("appointments")
    .select("*")
    .order("start_time", { ascending: true });
  if (operationsBranchId) {
    apptQuery = apptQuery.eq("branch_id", operationsBranchId);
  }
  const { data: appointments, error: apptErr } = await apptQuery;
  if (apptErr) console.error(apptErr);

  const apptRows = (appointments ?? []) as AppointmentRow[];
  const apptIds = apptRows.map((a) => a.id);

  let dispensedByAppointment: Record<string, DispensedItemRow[]> = {};
  if (apptIds.length > 0) {
    const { data: dispensed, error: dErr } = await supabase
      .from("dispensed_items")
      .select("*")
      .in("appointment_id", apptIds);
    if (dErr) console.error(dErr);
    dispensedByAppointment = {};
    for (const row of (dispensed ?? []) as DispensedItemRow[]) {
      const aid = row.appointment_id;
      if (!aid) continue;
      if (!dispensedByAppointment[aid]) dispensedByAppointment[aid] = [];
      dispensedByAppointment[aid].push(row);
    }
  }

  const { data: patientRows, error: pErr } = await supabase
    .from("patient_directory")
    .select("*")
    .order("patient_created_at", { ascending: false });
  if (pErr) console.error(pErr);

  let prodQuery = supabase
    .from("product_inventory")
    .select("*")
    .eq("is_active", true)
    .order("long_name", { ascending: true });
  if (operationsBranchId) {
    prodQuery = prodQuery.eq("branch_id", operationsBranchId);
  }
  const { data: products, error: prErr } = await prodQuery;
  if (prErr) console.error(prErr);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CalendarClient
        appointments={apptRows}
        dispensedByAppointment={dispensedByAppointment}
        patients={(patientRows ?? []) as PatientDirectoryRow[]}
        products={(products ?? []) as ProductInventoryRow[]}
        defaultBranchId={operationsBranchId}
        operatingDayWindow={operatingDayWindow}
      />
    </div>
  );
}
