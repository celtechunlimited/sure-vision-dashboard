"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type PatientMutationResult =
  | { ok: true }
  | { ok: false; message: string };

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

const updatePatientSchema = z.object({
  patientId: z.string().uuid(),
  first_name: z.string().trim().min(1, "First name is required"),
  middle_name: z.string().trim().nullable(),
  last_name: z.string().trim().min(1, "Last name is required"),
  contact_number: z.string().trim().nullable(),
  date_of_birth: z.union([isoDate, z.literal("")]).nullable(),
  address: z.string().trim().nullable(),
});

export async function updatePatientRecord(
  input: unknown,
): Promise<PatientMutationResult> {
  const parsed = updatePatientSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid form data" };
  }

  const middle =
    parsed.data.middle_name == null || parsed.data.middle_name === ""
      ? null
      : parsed.data.middle_name;
  const contact =
    parsed.data.contact_number == null ||
    parsed.data.contact_number === ""
      ? null
      : parsed.data.contact_number;
  const dob =
    parsed.data.date_of_birth == null || parsed.data.date_of_birth === ""
      ? null
      : parsed.data.date_of_birth;
  const addr =
    parsed.data.address == null || parsed.data.address === ""
      ? null
      : parsed.data.address;

  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({
      first_name: parsed.data.first_name,
      middle_name: middle,
      last_name: parsed.data.last_name,
      contact_number: contact,
      date_of_birth: dob,
      address: addr,
    })
    .eq("id", parsed.data.patientId);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/users/patients");
  return { ok: true };
}

const userIdSchema = z.string().uuid();

export async function deactivatePatientUser(
  userId: string,
): Promise<PatientMutationResult> {
  const idParse = userIdSchema.safeParse(userId);
  if (!idParse.success) {
    return { ok: false, message: "Invalid user id" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("id", idParse.data)
    .eq("user_type", "patient")
    .select("id");

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }
  if (!data?.length) {
    return { ok: false, message: "No matching patient account found" };
  }

  revalidatePath("/admin/users/patients");
  return { ok: true };
}

export async function activatePatientUser(
  userId: string,
): Promise<PatientMutationResult> {
  const idParse = userIdSchema.safeParse(userId);
  if (!idParse.success) {
    return { ok: false, message: "Invalid user id" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .update({ is_active: true })
    .eq("id", idParse.data)
    .eq("user_type", "patient")
    .select("id");

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }
  if (!data?.length) {
    return { ok: false, message: "No matching patient account found" };
  }

  revalidatePath("/admin/users/patients");
  return { ok: true };
}
