import { z } from "zod";

import { normalizeHhmm } from "@/lib/branch-form-utils";

const HHMM = /^([01]\d|2[0-3])([0-5]\d)$/;

export const branchFormSchema = z.object({
  long_name: z.string().trim().min(1, "Long name is required"),
  short_name: z.string().trim().min(1, "Short name is required"),
  address: z.string().trim().min(1, "Address is required"),
  contact_number: z.string().trim().min(1, "Contact number is required"),
  contact_email: z.string().trim().email("Enter a valid email"),
  start_time: z.string().trim().min(1, "Start time is required"),
  end_time: z.string().trim().min(1, "End time is required"),
  appointment_slot_duration: z.coerce
    .number()
    .int()
    .positive()
    .max(24 * 60),
});

export type BranchFormInput = z.infer<typeof branchFormSchema>;

export type BranchMutationResult =
  | { ok: true }
  | { ok: false; message: string };

export function parseBranchForm(input: unknown): BranchMutationResult & {
  data?: {
    fields: BranchFormInput;
    start_time: string;
    end_time: string;
    operating_hours: { start_time: string; end_time: string };
  };
} {
  const parsed = branchFormSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid form data" };
  }
  const start = normalizeHhmm(parsed.data.start_time);
  const end = normalizeHhmm(parsed.data.end_time);
  if (!HHMM.test(start)) {
    return {
      ok: false,
      message: "Start time must be 24h HHMM (e.g. 0900)",
    };
  }
  if (!HHMM.test(end)) {
    return {
      ok: false,
      message: "End time must be 24h HHMM (e.g. 1800)",
    };
  }
  const operating_hours = { start_time: start, end_time: end };
  return {
    ok: true,
    data: {
      fields: parsed.data,
      start_time: start,
      end_time: end,
      operating_hours,
    },
  };
}
