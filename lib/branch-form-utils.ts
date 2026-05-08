/** Normalize user input to a 4-digit HHMM string. */
export function normalizeHhmm(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.length > 4 ? digits.slice(-4) : digits.padStart(4, "0");
}
