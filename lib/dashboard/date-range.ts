/** Start/end of local calendar day as ISO strings (for timestamptz filters). */
export function todayRange(): { startIso: string; endIso: string } {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Monday 00:00 through next Monday 00:00 (local), containing `ref` (default: now). */
export function weekRangeContaining(
  ref: Date = new Date(),
): { weekStartIso: string; weekEndIso: string } {
  const day = ref.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate() + diffToMonday,
    0,
    0,
    0,
    0,
  );
  const nextMonday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 7,
    0,
    0,
    0,
    0,
  );
  return {
    weekStartIso: monday.toISOString(),
    weekEndIso: nextMonday.toISOString(),
  };
}
