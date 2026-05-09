"use client";

import * as React from "react";

import { EventBlock } from "@/components/calendar/event-block";
import type { AppointmentRow } from "@/lib/appointments/types";
import {
  SLOT_MINUTES,
  appointmentLayoutPxInWindow,
  appointmentsForCalendarDay,
  dateFromVisibleSlot,
  formatHourLabel,
  normalizeRangeSlotIndices,
  operatingWindowSlotCount,
  startOfDay,
  type OperatingDayWindow,
} from "@/lib/calendar/utils";
import { cn } from "@/lib/utils";

const SLOT_HEIGHT_PX = 28;

export function TimeGrid({
  days,
  appointments,
  dayWindow,
  onSlotActivate,
  onEventClick,
}: {
  days: Date[];
  appointments: AppointmentRow[];
  dayWindow: OperatingDayWindow;
  onSlotActivate: (payload: {
    day: Date;
    startIso: string;
    endIso: string;
  }) => void;
  onEventClick: (a: AppointmentRow) => void;
}) {
  const slotCount = operatingWindowSlotCount(dayWindow, SLOT_MINUTES);
  const maxSlotIndex = slotCount - 1;
  const columnContentPx = slotCount * SLOT_HEIGHT_PX;

  const dragRef = React.useRef<{
    dayIndex: number;
    slotStart: number;
    slotEnd: number;
  } | null>(null);
  const [dragHighlight, setDragHighlight] = React.useState<{
    dayIndex: number;
    from: number;
    to: number;
  } | null>(null);

  const onSlotActivateRef = React.useRef(onSlotActivate);
  onSlotActivateRef.current = onSlotActivate;
  const daysRef = React.useRef(days);
  daysRef.current = days;
  const dayWindowRef = React.useRef(dayWindow);
  dayWindowRef.current = dayWindow;

  React.useEffect(() => {
    function up() {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      setDragHighlight(null);
      const w = dayWindowRef.current;
      const maxIdx = operatingWindowSlotCount(w, SLOT_MINUTES) - 1;
      const { from, to } = normalizeRangeSlotIndices(d.slotStart, d.slotEnd, maxIdx);
      const day = daysRef.current[d.dayIndex];
      if (!day) return;
      const sod = startOfDay(day);
      const start = dateFromVisibleSlot(day, from, SLOT_MINUTES, w);
      const end = new Date(sod);
      end.setMinutes(
        Math.min(w.endMinutes, w.startMinutes + (to + 1) * SLOT_MINUTES),
      );
      onSlotActivateRef.current({
        day,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
      });
    }
    document.addEventListener("mouseup", up);
    return () => document.removeEventListener("mouseup", up);
  }, []);

  function handleMouseDown(dayIndex: number, slotIndex: number) {
    dragRef.current = {
      dayIndex,
      slotStart: slotIndex,
      slotEnd: slotIndex,
    };
    setDragHighlight({
      dayIndex,
      from: slotIndex,
      to: slotIndex,
    });
  }

  function handleMouseEnter(dayIndex: number, slotIndex: number) {
    const d = dragRef.current;
    if (!d || d.dayIndex !== dayIndex) return;
    d.slotEnd = slotIndex;
    const { from, to } = normalizeRangeSlotIndices(
      d.slotStart,
      d.slotEnd,
      maxSlotIndex,
    );
    setDragHighlight({ dayIndex, from, to });
  }

  const highlight = dragHighlight;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-background">
      <div className="flex shrink-0 border-b bg-background">
        <div className="w-12 shrink-0 border-r sm:w-14" aria-hidden />
        {days.map((day) => {
          const isToday =
            new Date().toDateString() === new Date(day).toDateString();
          return (
            <div
              key={`h-${day.toISOString()}`}
              className={cn(
                "flex min-h-18 min-w-0 flex-1 flex-col items-center justify-center border-r px-1 py-2 text-center text-xs last:border-r-0 sm:text-sm",
                isToday && "bg-primary/5",
              )}
            >
              <div className="text-muted-foreground">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "font-semibold",
                  isToday &&
                    "flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-row overflow-auto">
        <div
          className="sticky left-0 z-20 flex w-12 shrink-0 flex-col border-r bg-background sm:w-14"
          style={{ minHeight: columnContentPx }}
        >
          {Array.from({ length: slotCount }, (_, i) => {
            const minute = dayWindow.startMinutes + i * SLOT_MINUTES;
            const showHour = minute % 60 === 0;
            return (
              <div
                key={i}
                className="box-border flex shrink-0 justify-end pr-1 text-[10px] text-muted-foreground sm:text-xs"
                style={{ height: SLOT_HEIGHT_PX }}
              >
                {showHour ? formatHourLabel(Math.floor(minute / 60)) : null}
              </div>
            );
          })}
        </div>
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-row">
          {days.map((day, dayIndex) => {
            const sod = startOfDay(day);
            const dayAppts = appointmentsForCalendarDay(
              day,
              appointments,
              dayWindow,
            );

            return (
              <div
                key={day.toISOString()}
                className="relative flex min-w-0 flex-1 flex-col border-r last:border-r-0"
              >
                <div
                  className="relative z-0 flex-1"
                  style={{ minHeight: columnContentPx }}
                >
                  {Array.from({ length: slotCount }, (_, slotIndex) => {
                    const inDrag =
                      highlight &&
                      highlight.dayIndex === dayIndex &&
                      slotIndex >= highlight.from &&
                      slotIndex <= highlight.to;
                    const minute = dayWindow.startMinutes + slotIndex * SLOT_MINUTES;
                    const onHour = minute % 60 === 0;
                    return (
                      <button
                        key={slotIndex}
                        type="button"
                        aria-label={`Time slot ${slotIndex}`}
                        className={cn(
                          "absolute left-0 right-0 z-0 border-b border-border/60 transition-colors hover:bg-muted/40",
                          onHour && "border-t border-border/40",
                          inDrag && "bg-primary/20",
                        )}
                        style={{
                          top: slotIndex * SLOT_HEIGHT_PX,
                          height: SLOT_HEIGHT_PX,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleMouseDown(dayIndex, slotIndex);
                        }}
                        onMouseEnter={() =>
                          handleMouseEnter(dayIndex, slotIndex)
                        }
                      />
                    );
                  })}

                  {dayAppts.map((a) => {
                    const layout = appointmentLayoutPxInWindow(
                      sod,
                      a.start_time,
                      a.end_time,
                      columnContentPx,
                      SLOT_MINUTES,
                      dayWindow,
                    );
                    if (!layout) return null;
                    return (
                      <div
                        key={a.id}
                        className="pointer-events-none absolute left-0.5 right-0.5 z-20"
                        style={{
                          top: layout.top,
                          height: layout.height,
                        }}
                      >
                        <div className="pointer-events-auto h-full min-h-0 p-px">
                          <EventBlock
                            appointment={a}
                            variant="time"
                            className="h-full min-h-0"
                            onClick={() => onEventClick(a)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { SLOT_HEIGHT_PX, startOfDay };
