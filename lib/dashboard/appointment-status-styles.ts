/** Solid chip styles aligned with `components/calendar/event-block.tsx`. */
export function appointmentStatusChipClass(
  status: string | null | undefined,
): string {
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
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-muted text-foreground";
  }
}
