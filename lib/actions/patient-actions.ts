"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBranchesForSwitcher } from "@/lib/actions/branch-actions";
import { createClient } from "@/lib/supabase/server";
import { PATIENT_FILES_BUCKET } from "@/lib/patient-files/types";

export type PatientMutationResult =
  | { ok: true }
  | { ok: false; message: string };

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

const patientFieldsSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required"),
    middle_name: z.string().trim().nullable(),
    last_name: z.string().trim().min(1, "Last name is required"),
    contact_number: z.string().trim().nullable(),
    date_of_birth: z.union([isoDate, z.literal("")]).nullable(),
    address: z.string().trim().nullable(),
    is_minor: z.boolean(),
    guardian_name: z.string().trim().nullable(),
    guardian_mobile: z.string().trim().nullable(),
    guardian_email: z.string().trim().nullable(),
    guardian_relationship: z.string().trim().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.is_minor) return;

    if (!data.guardian_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guardian name is required for minors",
        path: ["guardian_name"],
      });
    }
    if (!data.guardian_mobile?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guardian mobile number is required for minors",
        path: ["guardian_mobile"],
      });
    }
    if (!data.guardian_relationship?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guardian relationship is required for minors",
        path: ["guardian_relationship"],
      });
    }
    const email = data.guardian_email?.trim();
    if (email && !z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid guardian email address",
        path: ["guardian_email"],
      });
    }
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
  is_minor: boolean;
  guardian_name: string | null;
  guardian_mobile: string | null;
  guardian_email: string | null;
  guardian_relationship: string | null;
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

  if (!data.is_minor) {
    return {
      first_name: data.first_name,
      middle_name: middle,
      last_name: data.last_name,
      contact_number: contact,
      date_of_birth: dob,
      address: addr,
      is_minor: false,
      guardian_name: null,
      guardian_mobile: null,
      guardian_email: null,
      guardian_relationship: null,
    };
  }

  const guardianEmail =
    data.guardian_email == null || data.guardian_email === ""
      ? null
      : data.guardian_email;

  return {
    first_name: data.first_name,
    middle_name: middle,
    last_name: data.last_name,
    contact_number: contact,
    date_of_birth: dob,
    address: addr,
    is_minor: true,
    guardian_name: data.guardian_name!.trim(),
    guardian_mobile: data.guardian_mobile!.trim(),
    guardian_email: guardianEmail,
    guardian_relationship: data.guardian_relationship!.trim(),
  };
}

const patientIdSchema = z.object({
  patientId: z.string().uuid(),
});

async function assertSuperAdmin(): Promise<PatientMutationResult | { ok: true }> {
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

  if (profile?.user_type !== "super_admin") {
    return { ok: false, message: "Forbidden" };
  }
  return { ok: true };
}

async function requireStaffUser(): Promise<
  { ok: false; message: string } | { ok: true; userId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated." };

  const { data: profile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.user_type !== "super_admin" &&
    profile?.user_type !== "employee"
  ) {
    return { ok: false, message: "Not authorized." };
  }

  return { ok: true, userId: user.id };
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
      is_minor: fields.is_minor,
      guardian_name: fields.guardian_name,
      guardian_mobile: fields.guardian_mobile,
      guardian_email: fields.guardian_email,
      guardian_relationship: fields.guardian_relationship,
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

export async function softDeletePatientRecord(
  input: unknown,
): Promise<PatientMutationResult> {
  const parsed = patientIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid patient id" };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("patients")
    .select("id, deleted_at")
    .eq("id", parsed.data.patientId)
    .maybeSingle();

  if (fetchError) {
    console.error(fetchError);
    return { ok: false, message: fetchError.message };
  }
  if (!existing) {
    return { ok: false, message: "Patient not found" };
  }
  if (existing.deleted_at) {
    return { ok: false, message: "Patient is already deleted" };
  }

  const { error } = await supabase
    .from("patients")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: auth.userId,
    })
    .eq("id", parsed.data.patientId);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/users/patients");
  revalidatePath("/patients");
  revalidatePath(`/patients/${parsed.data.patientId}`);
  return { ok: true };
}

export async function restorePatientRecord(
  input: unknown,
): Promise<PatientMutationResult> {
  const parsed = patientIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid patient id" };
  }

  const authCheck = await assertSuperAdmin();
  if (!authCheck.ok) return authCheck;

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("patients")
    .select("id, deleted_at")
    .eq("id", parsed.data.patientId)
    .maybeSingle();

  if (fetchError) {
    console.error(fetchError);
    return { ok: false, message: fetchError.message };
  }
  if (!existing?.deleted_at) {
    return { ok: false, message: "Patient is not deleted" };
  }

  const { error } = await supabase
    .from("patients")
    .update({
      deleted_at: null,
      deleted_by: null,
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

export async function permanentlyDeletePatientRecord(
  input: unknown,
): Promise<PatientMutationResult> {
  const parsed = patientIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid patient id" };
  }

  const authCheck = await assertSuperAdmin();
  if (!authCheck.ok) return authCheck;

  const supabase = await createClient();
  const patientId = parsed.data.patientId;

  const { data: existing, error: fetchError } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();

  if (fetchError) {
    console.error(fetchError);
    return { ok: false, message: fetchError.message };
  }
  if (!existing) {
    return { ok: false, message: "Patient not found" };
  }

  const { data: fileRows, error: filesError } = await supabase
    .from("patient_files")
    .select("storage_path")
    .eq("patient_id", patientId);

  if (filesError) {
    console.error(filesError);
    return { ok: false, message: filesError.message };
  }

  const { error: appointmentError } = await supabase
    .from("appointments")
    .update({ patient_id: null })
    .eq("patient_id", patientId);

  if (appointmentError) {
    console.error(appointmentError);
    return { ok: false, message: appointmentError.message };
  }

  const { error: deleteError } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId);

  if (deleteError) {
    console.error(deleteError);
    return { ok: false, message: deleteError.message };
  }

  const storagePaths = (fileRows ?? [])
    .map((row) => row.storage_path)
    .filter(Boolean);

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(PATIENT_FILES_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      console.error(storageError);
    }
  }

  revalidatePath("/admin/users/patients");
  revalidatePath("/patients");
  return { ok: true };
}
