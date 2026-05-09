"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { BranchMutationResult } from "@/lib/branches/branch-form";
import { getBranchesForSwitcher } from "@/lib/actions/branch-actions";
import { createClient } from "@/lib/supabase/server";

const statusEnum = z.enum([
  "pending",
  "confirmed",
  "completed",
  "in_progress",
  "cancelled",
]);

const appointmentTypeEnum = z.enum([
  "consultation",
  "eye_examination",
  "fitting",
  "follow_up",
]);

const dispensedLineSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unit_price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().nonnegative().nullable(),
  ),
  product_name: z.string().trim().min(1, "Product name is required"),
  product_sku: z
    .string()
    .trim()
    .optional()
    .transform((s) => (!s ? null : s)),
});

const appointmentUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    branch_id: z.string().uuid(),
    patient_id: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.string().uuid().nullable(),
    ),
    patient_name: z.string().trim().min(1, "Patient name is required"),
    patient_contact_number: z.preprocess(
      (v) =>
        v === "" || v === null || v === undefined
          ? null
          : String(v).trim() || null,
      z.string().nullable(),
    ),
    patient_email: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.union([z.string().email(), z.null()]),
    ),
    start_time: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.string().min(1).nullable(),
    ),
    end_time: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.string().min(1).nullable(),
    ),
    status: statusEnum,
    appointment_type: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      appointmentTypeEnum.nullable(),
    ),
    notes: z.preprocess(
      (v) =>
        v === "" || v === null || v === undefined
          ? null
          : String(v).trim() || null,
      z.string().nullable(),
    ),
    dispensed_items: z.array(dispensedLineSchema),
  })
  .superRefine((data, ctx) => {
    if (data.start_time && data.end_time) {
      const a = new Date(data.start_time).getTime();
      const b = new Date(data.end_time).getTime();
      if (!Number.isNaN(a) && !Number.isNaN(b) && b < a) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time must be on or after start time",
          path: ["end_time"],
        });
      }
    }
  });

async function assertBranchAllowed(
  branchId: string | null | undefined,
): Promise<{ ok: true; branchId: string } | { ok: false; message: string }> {
  const idParse = z.string().uuid().safeParse(branchId);
  if (!idParse.success) {
    return { ok: false, message: "A branch is required" };
  }
  const { branches } = await getBranchesForSwitcher();
  const allowed = new Set(branches.map((b) => b.id));
  if (!allowed.has(idParse.data)) {
    return { ok: false, message: "You cannot manage appointments for that branch" };
  }
  return { ok: true, branchId: idParse.data };
}

async function currentUserDispensedBy(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: emp } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return emp?.id ?? null;
}

export async function upsertAppointmentWithDispensed(
  input: unknown,
): Promise<BranchMutationResult> {
  const parsed = appointmentUpsertSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid appointment data" };
  }
  const row = parsed.data;

  const branchCheck = await assertBranchAllowed(row.branch_id);
  if (!branchCheck.ok) return branchCheck;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Not signed in" };
  }

  const dispensedBy = await currentUserDispensedBy(supabase);

  for (const line of row.dispensed_items) {
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, branch_id")
      .eq("id", line.product_id)
      .maybeSingle();
    if (pErr) {
      console.error(pErr);
      return { ok: false, message: pErr.message };
    }
    if (!product || product.branch_id !== branchCheck.branchId) {
      return { ok: false, message: "A dispensed product is not in this branch" };
    }
  }

  const patientId = row.patient_id;

  const basePayload = {
    branch_id: branchCheck.branchId,
    patient_id: patientId,
    patient_name: row.patient_name,
    patient_contact_number: row.patient_contact_number,
    patient_email: row.patient_email,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    appointment_type: row.appointment_type,
    notes: row.notes,
  };

  let appointmentId: string;

  if (row.id) {
    const idParse = z.string().uuid().safeParse(row.id);
    if (!idParse.success) {
      return { ok: false, message: "Invalid appointment" };
    }
    const { data, error } = await supabase
      .from("appointments")
      .update(basePayload)
      .eq("id", idParse.data)
      .select("id");

    if (error) {
      console.error(error);
      return { ok: false, message: error.message };
    }
    if (!data?.length) {
      return { ok: false, message: "Appointment not found or not permitted" };
    }
    appointmentId = idParse.data;

    const { error: delErr } = await supabase
      .from("dispensed_items")
      .delete()
      .eq("appointment_id", appointmentId);
    if (delErr) {
      console.error(delErr);
      return { ok: false, message: delErr.message };
    }
  } else {
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        ...basePayload,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return { ok: false, message: error.message };
    }
    if (!data?.id) {
      return { ok: false, message: "Could not create appointment" };
    }
    appointmentId = data.id;
  }

  if (row.dispensed_items.length > 0) {
    const inserts = row.dispensed_items.map((line) => ({
      appointment_id: appointmentId,
      product_id: line.product_id,
      product_name: line.product_name,
      product_sku: line.product_sku,
      quantity: line.quantity,
      unit_price: line.unit_price,
      dispensed_by: dispensedBy,
    }));
    const { error: insErr } = await supabase.from("dispensed_items").insert(inserts);
    if (insErr) {
      console.error(insErr);
      return { ok: false, message: insErr.message };
    }
  }

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/");
  return { ok: true };
}

/** Sets a pending appointment to confirmed; branch must match switcher scope. */
export async function confirmAppointmentBooking(
  appointmentId: unknown,
): Promise<BranchMutationResult> {
  const idParse = z.string().uuid().safeParse(appointmentId);
  if (!idParse.success) {
    return { ok: false, message: "Invalid appointment" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Not signed in" };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("appointments")
    .select("id, branch_id, status")
    .eq("id", idParse.data)
    .maybeSingle();

  if (fetchErr) {
    console.error(fetchErr);
    return { ok: false, message: fetchErr.message };
  }
  if (!row?.branch_id) {
    return { ok: false, message: "Appointment not found" };
  }

  const branchCheck = await assertBranchAllowed(row.branch_id);
  if (!branchCheck.ok) return branchCheck;

  if (row.status !== "pending") {
    return { ok: false, message: "Only pending bookings can be confirmed" };
  }

  const { data: updated, error: updErr } = await supabase
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", idParse.data)
    .eq("status", "pending")
    .select("id");

  if (updErr) {
    console.error(updErr);
    return { ok: false, message: updErr.message };
  }
  if (!updated?.length) {
    return {
      ok: false,
      message: "Could not confirm this booking (it may have been updated).",
    };
  }

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/");
  return { ok: true };
}
