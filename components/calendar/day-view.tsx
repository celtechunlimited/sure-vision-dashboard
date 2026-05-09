"use client";

import { TimeGrid } from "@/components/calendar/time-grid";
import type { AppointmentRow } from "@/lib/appointments/types";
import type { OperatingDayWindow } from "@/lib/calendar/utils";
import { startOfDay } from "@/lib/calendar/utils";

export function DayView({
  anchorDate,
  appointments,
  dayWindow,
  onSlotActivate,
  onEventClick,
}: {
  anchorDate: Date;
  appointments: AppointmentRow[];
  dayWindow: OperatingDayWindow;
  onSlotActivate: (p: { day: Date; startIso: string; endIso: string }) => void;
  onEventClick: (a: AppointmentRow) => void;
}) {
  return (
    <TimeGrid
      days={[startOfDay(anchorDate)]}
      appointments={appointments}
      dayWindow={dayWindow}
      onSlotActivate={onSlotActivate}
      onEventClick={onEventClick}
    />
  );
}
