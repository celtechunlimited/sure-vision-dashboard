"use client";

import * as React from "react";

import { AppointmentFormDialog } from "@/components/appointments/appointment-form-dialog";
import {
  CalendarToolbar,
  type CalendarView,
} from "@/components/calendar/calendar-toolbar";
import { DayView } from "@/components/calendar/day-view";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import type { AppointmentRow, DispensedItemRow } from "@/lib/appointments/types";
import type { PatientDirectoryRow } from "@/lib/patients/types";
import type { ProductInventoryRow } from "@/lib/products/types";
import { startOfDay, type OperatingDayWindow } from "@/lib/calendar/utils";

export type CalendarClientProps = {
  appointments: AppointmentRow[];
  dispensedByAppointment: Record<string, DispensedItemRow[]>;
  patients: PatientDirectoryRow[];
  products: ProductInventoryRow[];
  defaultBranchId: string | null;
  operatingDayWindow: OperatingDayWindow;
};

export function CalendarClient({
  appointments,
  dispensedByAppointment,
  patients,
  products,
  defaultBranchId,
  operatingDayWindow,
}: CalendarClientProps) {
  const [view, setView] = React.useState<CalendarView>("week");
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">(
    "create",
  );
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<AppointmentRow | null>(null);
  const [prefillStartIso, setPrefillStartIso] = React.useState<string | null>(
    null,
  );
  const [prefillEndIso, setPrefillEndIso] = React.useState<string | null>(null);

  const handleDialogOpenChange = React.useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedAppointment(null);
      setPrefillStartIso(null);
      setPrefillEndIso(null);
    }
  }, []);

  const openCreate = React.useCallback(
    (startIso: string | null, endIso: string | null) => {
      setDialogMode("create");
      setSelectedAppointment(null);
      setPrefillStartIso(startIso);
      setPrefillEndIso(endIso);
      setDialogOpen(true);
    },
    [],
  );

  const openEdit = React.useCallback((a: AppointmentRow) => {
    setDialogMode("edit");
    setSelectedAppointment(a);
    setPrefillStartIso(null);
    setPrefillEndIso(null);
    setDialogOpen(true);
  }, []);

  const onSlotActivate = React.useCallback(
    (p: { day: Date; startIso: string; endIso: string }) => {
      openCreate(p.startIso, p.endIso);
    },
    [openCreate],
  );

  const onMonthDayClick = React.useCallback(
    (day: Date) => {
      const sod = startOfDay(day);
      const w = operatingDayWindow;
      const h = Math.floor(w.startMinutes / 60);
      const mi = w.startMinutes % 60;
      sod.setHours(h, mi, 0, 0);
      const end = new Date(sod.getTime() + 30 * 60000);
      openCreate(sod.toISOString(), end.toISOString());
    },
    [openCreate, operatingDayWindow],
  );

  const initialDispensed =
    dialogMode === "edit" && selectedAppointment
      ? (dispensedByAppointment[selectedAppointment.id] ?? [])
      : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CalendarToolbar
        view={view}
        onViewChange={setView}
        currentDate={currentDate}
        onCurrentDateChange={setCurrentDate}
      />
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 lg:px-6">
        {view === "day" ? (
          <DayView
            anchorDate={currentDate}
            appointments={appointments}
            dayWindow={operatingDayWindow}
            onSlotActivate={onSlotActivate}
            onEventClick={openEdit}
          />
        ) : view === "week" ? (
          <WeekView
            anchorDate={currentDate}
            appointments={appointments}
            dayWindow={operatingDayWindow}
            onSlotActivate={onSlotActivate}
            onEventClick={openEdit}
          />
        ) : (
          <MonthView
            anchorDate={currentDate}
            appointments={appointments}
            dayWindow={operatingDayWindow}
            onDayClick={onMonthDayClick}
            onEventClick={openEdit}
          />
        )}
      </div>

      <AppointmentFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        mode={dialogMode}
        branchId={defaultBranchId}
        appointment={selectedAppointment}
        initialDispensed={initialDispensed}
        patients={patients}
        products={products}
        prefillStartIso={prefillStartIso}
        prefillEndIso={prefillEndIso}
      />
    </div>
  );
}
