"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AppointmentRow,
  AppointmentStatus,
  AppointmentType,
} from "@/lib/appointments/types";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPES,
} from "@/lib/appointments/types";

function statusClasses(status: string | null | undefined): string {
  switch (status) {
    case "pending":
      return "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-50";
    case "confirmed":
      return "border-blue-600 bg-blue-100 text-blue-950 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-50";
    case "completed":
      return "border-emerald-600 bg-emerald-100 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-50";
    case "in_progress":
      return "border-violet-600 bg-violet-100 text-violet-950 dark:border-violet-500 dark:bg-violet-950 dark:text-violet-50";
    case "cancelled":
      return "border-border bg-muted text-muted-foreground line-through";
    default:
      return "border-border bg-muted text-foreground";
  }
}

export type EventBlockVariant = "time" | "month";

export function eventTitle(a: AppointmentRow): string {
  const n = a.patient_name?.trim();
  if (n) return n;
  return "Appointment";
}

function formatTimeOnly(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function appointmentTypeLabel(a: AppointmentRow): string {
  const t = a.appointment_type as string | null;
  if (!t || !String(t).trim()) return "—";
  if (APPOINTMENT_TYPES.includes(t as AppointmentType)) {
    return APPOINTMENT_TYPE_LABELS[t as AppointmentType];
  }
  return String(t).replace(/_/g, " ");
}

function appointmentStatusLabel(a: AppointmentRow): string {
  const s = a.status as string | null;
  if (!s) return "—";
  if (APPOINTMENT_STATUSES.includes(s as AppointmentStatus)) {
    return APPOINTMENT_STATUS_LABELS[s as AppointmentStatus];
  }
  return String(s).replace(/_/g, " ");
}

function timeRangeLine(a: AppointmentRow): string {
  const start = formatTimeOnly(a.start_time);
  const end = formatTimeOnly(a.end_time);
  if (!start && !end) return "—";
  if (!end) return start;
  if (!start) return end;
  return `${start} – ${end}`;
}

export function EventBlock({
  appointment,
  variant,
  className,
  onClick,
}: {
  appointment: AppointmentRow;
  variant: EventBlockVariant;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const title = eventTitle(appointment);
  const typeLabel = appointmentTypeLabel(appointment);
  const times = timeRangeLine(appointment);
  const statusLabel = appointmentStatusLabel(appointment);
  const tip = [title, typeLabel, times, statusLabel].join("\n");

  const isMonth = variant === "month";

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      title={tip}
        className={cn(
        "w-full rounded border text-left shadow-sm transition hover:brightness-[0.97] dark:hover:brightness-110",
        "flex flex-col items-stretch",
        statusClasses(appointment.status),
        isMonth
          ? "gap-0.5 px-1 py-1 text-[10px] leading-snug"
          : "gap-1 px-2 py-1.5 text-xs leading-snug",
        className,
      )}
    >
      <span
        className={cn(
          "truncate font-semibold tracking-tight",
          isMonth ? "text-[10px]" : "text-[11px] sm:text-xs",
        )}
      >
        {title}
      </span>
      <span
        className={cn(
          "truncate text-muted-foreground",
          isMonth ? "text-[9px] leading-tight" : "text-[11px] leading-tight",
        )}
      >
        {typeLabel}
      </span>
      <span
        className={cn(
          "tabular-nums text-foreground",
          isMonth ? "text-[9px]" : "text-[11px] sm:text-xs",
        )}
      >
        {times}
      </span>
      {isMonth ? (
        <span className="truncate text-[9px] font-medium text-foreground">
          {statusLabel}
        </span>
      ) : (
        <Badge
          variant="outline"
          className="h-auto w-fit min-w-0 max-w-full justify-start truncate border-border bg-background px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground"
        >
          {statusLabel}
        </Badge>
      )}
    </button>
  );
}
