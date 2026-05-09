"use client";

import { EventBlock } from "@/components/calendar/event-block";
import type { AppointmentRow } from "@/lib/appointments/types";
import {
  appointmentsForCalendarDay,
  getMonthGrid,
  isSameDay,
  type OperatingDayWindow,
} from "@/lib/calendar/utils";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 3;

export function MonthView({
  anchorDate,
  appointments,
  dayWindow,
  onDayClick,
  onEventClick,
}: {
  anchorDate: Date;
  appointments: AppointmentRow[];
  dayWindow: OperatingDayWindow;
  onDayClick: (day: Date) => void;
  onEventClick: (a: AppointmentRow) => void;
}) {
  const cells = getMonthGrid(anchorDate);
  const today = new Date();

  return (
    <div className="flex min-h-[520px] flex-1 flex-col overflow-auto rounded-md border bg-background">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground sm:text-sm">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-1 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-7">
        {cells.map(({ date, inMonth }) => {
          const dayAppts = appointmentsForCalendarDay(date, appointments, dayWindow);
          const visible = dayAppts.slice(0, MAX_VISIBLE);
          const rest = dayAppts.length - visible.length;
          const isToday = isSameDay(date, today);

          return (
            <div
              key={date.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDayClick(date);
                }
              }}
              className={cn(
                "flex min-h-[88px] cursor-pointer flex-col gap-0.5 border-b border-r p-1 text-left outline-none transition-colors hover:bg-muted/40 last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring",
                !inMonth && "bg-muted/20 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "mb-0.5 flex size-7 items-center justify-center rounded-full text-xs font-semibold sm:text-sm",
                  isToday && "bg-primary text-primary-foreground",
                  !isToday && inMonth && "text-foreground",
                )}
              >
                {date.getDate()}
              </span>
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {visible.map((a) => (
                  <div
                    key={a.id}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <EventBlock
                      appointment={a}
                      variant="month"
                      onClick={() => onEventClick(a)}
                    />
                  </div>
                ))}
                {rest > 0 ? (
                  <span className="truncate px-0.5 text-[10px] text-muted-foreground sm:text-xs">
                    +{rest} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
