"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addDays,
  addMonths,
  formatDayTitle,
  formatMonthYear,
  formatWeekRange,
  getWeekDays,
} from "@/lib/calendar/utils";

export type CalendarView = "day" | "week" | "month";

export function CalendarToolbar({
  view,
  onViewChange,
  currentDate,
  onCurrentDateChange,
}: {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  currentDate: Date;
  onCurrentDateChange: (d: Date) => void;
}) {
  const weekDays = getWeekDays(currentDate);

  function goPrev() {
    if (view === "day") onCurrentDateChange(addDays(currentDate, -1));
    else if (view === "week") onCurrentDateChange(addDays(currentDate, -7));
    else onCurrentDateChange(addMonths(currentDate, -1));
  }

  function goNext() {
    if (view === "day") onCurrentDateChange(addDays(currentDate, 1));
    else if (view === "week") onCurrentDateChange(addDays(currentDate, 7));
    else onCurrentDateChange(addMonths(currentDate, 1));
  }

  function goToday() {
    onCurrentDateChange(new Date());
  }

  const title =
    view === "month"
      ? formatMonthYear(currentDate)
      : view === "week"
        ? formatWeekRange(weekDays)
        : formatDayTitle(currentDate);

  return (
    <div className="flex flex-col gap-3 border-b bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={goToday}>
          Today
        </Button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Previous"
            onClick={goPrev}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Next"
            onClick={goNext}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h1>
      </div>
      <Select value={view} onValueChange={(v) => onViewChange(v as CalendarView)}>
        <SelectTrigger className="w-[140px]" size="sm" aria-label="Calendar view">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Day</SelectItem>
          <SelectItem value="week">Week</SelectItem>
          <SelectItem value="month">Month</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
