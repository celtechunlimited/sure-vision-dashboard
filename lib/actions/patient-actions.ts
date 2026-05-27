"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBranchesForSwitcher } from "@/lib/actions/branch-actions";
import { createClient } from "@/lib/supabase/server";

export type PatientMutationResult =
  | { ok: true }
  | { ok: false; message: string };

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

const patientFieldsSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  middle_name: z.string().trim().nullable(),
  last_name: z.string().trim().min(1, "Last name is required"),
  contact_number: z.string().trim().nullable(),
  date_of_birth: z.union([isoDate, z.literal("")]).nullable(),
  address: z.string().trim().nullable(),
});

const updatePatientSchema = patientFieldsSchema.extend({
  patientId: z.string().uuid(),
});

const createPatientSchema = patientFieldsSchema.extend({
  branchIds: z.array(z.string().uuid()).optional(),
});

const setPatientBranchesSchema = z.object({
  patientId: z.string().uuid(),
  branchIds: z.array(z.string().uuid()),
});

function normalizePatientFields(
  data: z.infer<typeof patientFieldsSchema>,
): {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  contact_number: string | null;
  date_of_birth: string | null;
  address: string | null;
} {
  const middle =
    data.middle_name == null || data.middle_name === ""
      ? null
      : data.middle_name;
  const contact =
    data.contact_number == null || data.contact_number === ""
      ? null
      : data.contact_number;
  const dob =
    data.date_of_birth == null || data.date_of_birth === ""
      ? null
      : data.date_of_birth;
  const addr =
    data.address == null || data.address === "" ? null : data.address;
  return {
    first_name: data.first_name,
    middle_name: middle,
    last_name: data.last_name,
    contact_number: contact,
    date_of_birth: dob,
    address: addr,
  };
}

async function canManagePatientBranches(
  patientId: string,
): Promise<{ ok: true } | PatientMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in" };

  const { data: profile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.user_type === "super_admin") return { ok: true };

  if (profile?.user_type !== "employee") {
    return { ok: false, message: "Forbidden" };
  }

  const { data: myEmployee } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myEmployee?.id) return { ok: false, message: "Forbidden" };

  const { data: patientBranches } = await supabase
    .from("patient_branches")
    .select("branch_id")
    .eq("patient_id", patientId);

  const { data: myBranches } = await supabase
    .from("employee_branches")
    .select("branch_id")
    .eq("employee_id", myEmployee.id);

  const myBranchIds = new Set((myBranches ?? []).map((r) => r.branch_id));
  const sharesBranch = (patientBranches ?? []).some((pb) =>
    myBranchIds.has(pb.branch_id),
  );

  if (!sharesBranch && (patientBranches ?? []).length > 0) {
    return { ok: false, message: "Forbidden" };
  }

  return { ok: true };
}

export async function setPatientBranches(
  input: unknown,
): Promise<PatientMutationResult> {
  const parsed = setPatientBranchesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid input" };
  }

  const authCheck = await canManagePatientBranches(parsed.data.patientId);
  if (!authCheck.ok) return authCheck;

  const supabase = await createClient();
  const { patientId, branchIds } = parsed.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  if (profile?.user_type === "employee") {
    const { branches } = await getBranchesForSwitcher();
    const allowed = new Set(branches.map((b) => b.id));
    if (!branchIds.every((id) => allowed.has(id))) {
      return { ok: false, message: "Cannot assign branches you do not have access to" };
    }
  }

  const { error: deleteError } = await supabase
    .from("patient_branches")
    .delete()
    .eq("patient_id", patientId);

  if (deleteError) {
    console.error(deleteError);
    return { ok: false, message: deleteError.message };
  }

  if (branchIds.length > 0) {
    const { error: insertError } = await supabase.from("patient_branches").insert(
      branchIds.map((branch_id) => ({
        patient_id: patientId,
        branch_id,
      })),
    );

    if (insertError) {
      console.error(insertError);
      return { ok: false, message: insertError.message };
    }
  }

  revalidatePath("/admin/users/patients");
  revalidatePath("/patients");
  return { ok: true };
}

export async function createPatientRecord(
  input: unknown,
): Promise<PatientMutationResult> {
  const parsed = createPatientSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid form data" };
  }

  const branchIds = parsed.data.branchIds ?? [];
  if (branchIds.length === 0) {
    return { ok: false, message: "At least one branch assignment is required" };
  }

  const fields = normalizePatientFields(parsed.data);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .insert(fields)
    .select("id");

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }
  if (!data?.length) {
    return { ok: false, message: "Patient was not created" };
  }

  const patientId = data[0]!.id;
  const { error: branchError } = await supabase.from("patient_branches").insert(
    branchIds.map((branch_id) => ({
      patient_id: patientId,
      branch_id,
    })),
  );

  if (branchError) {
    console.error(branchError);
    return { ok: false, message: branchError.message };
  }

  revalidatePath("/admin/users/patients");
  revalidatePath("/patients");
  return { ok: true };
}

export async function updatePatientRecord(
  input: unknown,
): Promise<PatientMutationResult> {
  const parsed = updatePatientSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid form data" };
  }

  const fields = normalizePatientFields(parsed.data);

  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({
      first_name: fields.first_name,
      middle_name: fields.middle_name,
      last_name: fields.last_name,
      contact_number: fields.contact_number,
      date_of_birth: fields.date_of_birth,
      address: fields.address,
    })
    .eq("id", parsed.data.patientId);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/users/patients");
  revalidatePath("/patients");
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
  revalidatePath("/patients");
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
  revalidatePath("/patients");
  return { ok: true };
}
