"use client";

import { TimeGrid } from "@/components/calendar/time-grid";
import type { AppointmentRow } from "@/lib/appointments/types";
import type { OperatingDayWindow } from "@/lib/calendar/utils";
import { getWeekDays } from "@/lib/calendar/utils";

export function WeekView({
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
      days={getWeekDays(anchorDate)}
      appointments={appointments}
      dayWindow={dayWindow}
      onSlotActivate={onSlotActivate}
      onEventClick={onEventClick}
    />
  );
}
