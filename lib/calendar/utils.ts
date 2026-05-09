import type { AppointmentRow } from "@/lib/appointments/types";

/** 30-minute slots for day/week grid (Google Calendar-like). */
export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;

/** Local-day minutes window from branch `operating_hours` (HHMM). `endMinutes` is exclusive (last slot ends here). */
export type OperatingDayWindow = {
  startMinutes: number;
  endMinutes: number;
};

export const FULL_DAY_OPERATING_WINDOW: OperatingDayWindow = {
  startMinutes: 0,
  endMinutes: 24 * 60,
};

function parseHHMMToMinutes(s: string): number | null {
  const digits = String(s).replace(/\D/g, "").padStart(4, "0").slice(-4);
  if (!/^([01]\d|2[0-3])([0-5]\d)$/.test(digits)) return null;
  const h = parseInt(digits.slice(0, 2), 10);
  const m = parseInt(digits.slice(2, 4), 10);
  return h * 60 + m;
}

/** Parse `branches.operating_hours` JSON `{ start_time, end_time }` as 24h HHMM. Falls back to full day if invalid. */
export function parseBranchOperatingDayWindow(oh: unknown): OperatingDayWindow {
  if (!oh || typeof oh !== "object" || Array.isArray(oh)) {
    return FULL_DAY_OPERATING_WINDOW;
  }
  const o = oh as Record<string, unknown>;
  const st =
    typeof o.start_time === "string" ? parseHHMMToMinutes(o.start_time) : null;
  const et =
    typeof o.end_time === "string" ? parseHHMMToMinutes(o.end_time) : null;
  if (st == null || et == null) return FULL_DAY_OPERATING_WINDOW;
  if (et <= st) return FULL_DAY_OPERATING_WINDOW;
  return { startMinutes: st, endMinutes: et };
}

/** Number of `slotMinutes` slots in `[startMinutes, endMinutes)`. */
export function operatingWindowSlotCount(
  window: OperatingDayWindow,
  slotMinutes: number,
): number {
  const span = window.endMinutes - window.startMinutes;
  if (span <= 0) return SLOTS_PER_DAY;
  return Math.max(1, Math.round(span / slotMinutes));
}

/** Parse `timestamptz` / ISO strings from Supabase or JSON (defensive for RSC payloads). */
export function parseAppointmentInstant(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  return null;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function dateFromVisibleSlot(
  day: Date,
  slotIndex: number,
  slotMinutes: number,
  window: OperatingDayWindow,
): Date {
  const x = startOfDay(day);
  x.setMinutes(window.startMinutes + slotIndex * slotMinutes);
  return x;
}

/**
 * Whether the appointment (clipped to local `day`) overlaps
 * `[window.startMinutes, window.endMinutes)` in local minutes-from-midnight.
 */
export function appointmentIntersectsOperatingWindow(
  day: Date,
  a: AppointmentRow,
  window: OperatingDayWindow,
  slotMinutes: number,
): boolean {
  const W = window.endMinutes - window.startMinutes;
  if (W <= 0) return false;

  const sod = startOfDay(day);
  const start = parseAppointmentInstant(a.start_time);
  if (!start) return false;
  let end = parseAppointmentInstant(a.end_time);
  if (!end) {
    end = new Date(start.getTime() + slotMinutes * 60000);
  }
  if (Number.isNaN(end.getTime())) return false;

  const dayEnd = endOfDay(sod);
  let clipStart = start < sod ? sod : start;
  let clipEnd = end > dayEnd ? dayEnd : end;
  if (clipEnd.getTime() <= clipStart.getTime()) {
    clipEnd = new Date(clipStart.getTime() + slotMinutes * 60000);
    if (clipEnd > dayEnd) clipEnd = dayEnd;
    if (clipEnd.getTime() <= clipStart.getTime()) return false;
  }

  const mStart = minutesBetween(sod, clipStart);
  const mEnd = minutesBetween(sod, clipEnd);
  return mEnd > window.startMinutes && mStart < window.endMinutes;
}

/** Appointments that overlap a local calendar day (exclusive end at next midnight). */
export function appointmentsForCalendarDay(
  day: Date,
  appointments: AppointmentRow[],
  operatingWindow?: OperatingDayWindow,
): AppointmentRow[] {
  const sod = startOfDay(day);
  const nextMidnight = addDays(sod, 1);
  let rows = appointments
    .filter((a) => {
      const st = parseAppointmentInstant(a.start_time);
      if (!st) return false;
      const endRaw = parseAppointmentInstant(a.end_time);
      const en =
        endRaw ?? new Date(st.getTime() + SLOT_MINUTES * 60000);
      return en > sod && st < nextMidnight;
    })
    .sort((a, b) => {
      const ta = parseAppointmentInstant(a.start_time)?.getTime() ?? 0;
      const tb = parseAppointmentInstant(b.start_time)?.getTime() ?? 0;
      return ta - tb;
    });

  if (operatingWindow) {
    rows = rows.filter((a) =>
      appointmentIntersectsOperatingWindow(
        day,
        a,
        operatingWindow,
        SLOT_MINUTES,
      ),
    );
  }
  return rows;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Sunday = 0 … Saturday = 6 */
export function getDay(d: Date): number {
  return d.getDay();
}

/** First day shown in month grid: Sunday on or before the 1st of `anchor`'s month. */
export function getMonthGridStart(anchor: Date): Date {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const sun = getDay(first);
  return addDays(first, -sun);
}

/** 6 rows × 7 columns = 42 cells from `getMonthGridStart(anchor)`. */
export function getMonthGrid(anchor: Date): { date: Date; inMonth: boolean }[] {
  const start = getMonthGridStart(anchor);
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(start, i);
    cells.push({
      date,
      inMonth: date.getFullYear() === y && date.getMonth() === m,
    });
  }
  return cells;
}

/** Week containing `anchor`: Sunday … Saturday. */
export function getWeekDays(anchor: Date): Date[] {
  const sod = startOfDay(anchor);
  const sun = getDay(sod);
  const weekStart = addDays(sod, -sun);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatWeekRange(weekDays: Date[]): string {
  const a = weekDays[0]!;
  const b = weekDays[6]!;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.toLocaleDateString(undefined, { month: "short" })} ${a.getDate()} – ${b.getDate()}, ${a.getFullYear()}`;
  }
  return `${a.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${b.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function formatDayTitle(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortWeekday(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function formatDayNum(d: Date): string {
  return String(d.getDate());
}

/** "12 AM" … "11 PM" for label row */
export function formatHourLabel(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: undefined,
    hour12: true,
  });
}

export function snapDateToSlot(d: Date, slotMinutes: number): Date {
  const x = new Date(d);
  const total = x.getHours() * 60 + x.getMinutes();
  const snapped = Math.floor(total / slotMinutes) * slotMinutes;
  x.setHours(0, 0, 0, 0);
  x.setMinutes(snapped);
  return x;
}

export function slotIndexFromDate(dayStart: Date, at: Date, slotMinutes: number): number {
  const ms = at.getTime() - dayStart.getTime();
  const mins = Math.floor(ms / 60000);
  return Math.max(0, Math.min(SLOTS_PER_DAY - 1, Math.floor(mins / slotMinutes)));
}

export function dateFromSlot(dayStart: Date, slotIndex: number, slotMinutes: number): Date {
  const x = new Date(dayStart);
  x.setMinutes(x.getMinutes() + slotIndex * slotMinutes);
  return x;
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/** Top offset (px) and height (px) for an event inside a day column of height `columnContentPx`. */
export function appointmentLayoutPx(
  dayStart: Date,
  startIso: string | null,
  endIso: string | null,
  columnContentPx: number,
  slotMinutes: number,
): { top: number; height: number } | null {
  const start = parseAppointmentInstant(startIso);
  if (!start) return null;
  let end = parseAppointmentInstant(endIso);
  if (!end) {
    end = new Date(start.getTime() + slotMinutes * 60000);
  }
  if (Number.isNaN(end.getTime())) return null;

  const dayEnd = endOfDay(dayStart);
  let clipStart = start < dayStart ? dayStart : start;
  let clipEnd = end > dayEnd ? dayEnd : end;
  if (clipEnd.getTime() <= clipStart.getTime()) {
    clipEnd = new Date(clipStart.getTime() + slotMinutes * 60000);
    if (clipEnd > dayEnd) clipEnd = dayEnd;
    if (clipEnd.getTime() <= clipStart.getTime()) return null;
  }

  const totalMins = 24 * 60;
  const startMins = minutesBetween(dayStart, clipStart);
  const durMins = minutesBetween(clipStart, clipEnd);
  const pxPerMin = columnContentPx / totalMins;
  const top = Math.max(0, startMins * pxPerMin);
  const height = Math.max(4, durMins * pxPerMin);
  return { top, height };
}

/** Like `appointmentLayoutPx` but column height maps only to `[window.startMinutes, window.endMinutes)`. */
export function appointmentLayoutPxInWindow(
  dayStart: Date,
  startIso: string | null,
  endIso: string | null,
  columnContentPx: number,
  slotMinutes: number,
  window: OperatingDayWindow,
): { top: number; height: number } | null {
  const W = window.endMinutes - window.startMinutes;
  if (W <= 0) return null;

  const start = parseAppointmentInstant(startIso);
  if (!start) return null;
  let end = parseAppointmentInstant(endIso);
  if (!end) {
    end = new Date(start.getTime() + slotMinutes * 60000);
  }
  if (Number.isNaN(end.getTime())) return null;

  const dayEnd = endOfDay(dayStart);
  let clipStart = start < dayStart ? dayStart : start;
  let clipEnd = end > dayEnd ? dayEnd : end;
  if (clipEnd.getTime() <= clipStart.getTime()) {
    clipEnd = new Date(clipStart.getTime() + slotMinutes * 60000);
    if (clipEnd > dayEnd) clipEnd = dayEnd;
    if (clipEnd.getTime() <= clipStart.getTime()) return null;
  }

  const mStart = minutesBetween(dayStart, clipStart);
  const mEnd = minutesBetween(dayStart, clipEnd);

  const visStart = Math.max(mStart, window.startMinutes);
  const visEnd = Math.min(mEnd, window.endMinutes);
  if (visEnd <= visStart) {
    return null;
  }

  const top = ((visStart - window.startMinutes) / W) * columnContentPx;
  const height = Math.max(4, ((visEnd - visStart) / W) * columnContentPx);
  return { top, height };
}

export function normalizeRangeSlotIndices(
  a: number,
  b: number,
  maxSlotIndex: number = SLOTS_PER_DAY - 1,
): { from: number; to: number } {
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  return { from, to: Math.min(to, maxSlotIndex) };
}
