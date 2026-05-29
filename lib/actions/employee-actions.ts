"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type EmployeeMutationResult =
  | { ok: true }
  | { ok: false; message: string };

const employeeRoleSchema = z.enum(["manager", "staff"]);

const setBranchesSchema = z.object({
  employeeId: z.string().uuid(),
  branchIds: z.array(z.string().uuid()),
});

async function messageFromFunctionsError(error: unknown): Promise<string> {
  if (!error || typeof error !== "object") {
    return "Request failed";
  }
  const e = error as { message?: string; context?: { json?: () => Promise<unknown> } };
  let msg = typeof e.message === "string" ? e.message : "Request failed";
  if (e.context && typeof e.context.json === "function") {
    try {
      const body = (await e.context.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
  }
  return msg;
}

async function assertSuperAdmin(): Promise<EmployeeMutationResult | { ok: true }> {
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

export async function setEmployeeBranches(
  input: unknown,
): Promise<EmployeeMutationResult> {
  const parsed = setBranchesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid input" };
  }

  const authCheck = await assertSuperAdmin();
  if (!authCheck.ok) return authCheck;

  const supabase = await createClient();
  const { employeeId, branchIds } = parsed.data;

  const { error: deleteError } = await supabase
    .from("employee_branches")
    .delete()
    .eq("employee_id", employeeId);

  if (deleteError) {
    console.error(deleteError);
    return { ok: false, message: deleteError.message };
  }

  if (branchIds.length > 0) {
    const { error: insertError } = await supabase.from("employee_branches").insert(
      branchIds.map((branch_id) => ({
        employee_id: employeeId,
        branch_id,
      })),
    );

    if (insertError) {
      console.error(insertError);
      return { ok: false, message: insertError.message };
    }
  }

  revalidatePath("/admin/users/employees");
  revalidatePath("/employees");
  return { ok: true };
}

const createEmployeeSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().trim().min(1, "First name is required"),
  middle_name: z.string().trim().optional(),
  last_name: z.string().trim().min(1, "Last name is required"),
  employee_role: employeeRoleSchema,
  prefix: z.string().trim().min(1, "Prefix is required"),
  branchIds: z.array(z.string().uuid()).optional(),
});

export async function createEmployeeUser(
  input: unknown,
): Promise<EmployeeMutationResult> {
  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid form data" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke(
    "create_new_employee_user",
    {
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        first_name: parsed.data.first_name,
        middle_name: parsed.data.middle_name,
        last_name: parsed.data.last_name,
        employee_role: parsed.data.employee_role,
        prefix: parsed.data.prefix,
        branch_ids: parsed.data.branchIds ?? [],
      },
    },
  );

  if (error) {
    console.error(error);
    return { ok: false, message: await messageFromFunctionsError(error) };
  }

  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: string }).error;
    if (err) return { ok: false, message: err };
  }

  revalidatePath("/admin/users/employees");
  revalidatePath("/employees");
  return { ok: true };
}

const updateEmployeeSchema = z.object({
  employeeId: z.string().uuid(),
  first_name: z.string().trim().min(1, "First name is required"),
  middle_name: z.string().trim().nullable(),
  last_name: z.string().trim().min(1, "Last name is required"),
  prefix: z.string().trim().min(1, "Prefix is required"),
  employee_role: employeeRoleSchema,
});

export async function updateEmployeeRecord(
  input: unknown,
): Promise<EmployeeMutationResult> {
  const parsed = updateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid form data" };
  }

  const middle =
    parsed.data.middle_name == null || parsed.data.middle_name === ""
      ? null
      : parsed.data.middle_name;

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({
      first_name: parsed.data.first_name,
      middle_name: middle,
      last_name: parsed.data.last_name,
      prefix: parsed.data.prefix,
      employee_role: parsed.data.employee_role,
    })
    .eq("id", parsed.data.employeeId);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/users/employees");
  revalidatePath("/employees");
  return { ok: true };
}

const userIdSchema = z.string().uuid();

export async function deactivateEmployeeUser(
  userId: string,
): Promise<EmployeeMutationResult> {
  const idParse = userIdSchema.safeParse(userId);
  if (!idParse.success) {
    return { ok: false, message: "Invalid user id" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("id", idParse.data);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/users/employees");
  revalidatePath("/employees");
  return { ok: true };
}

export async function activateEmployeeUser(
  userId: string,
): Promise<EmployeeMutationResult> {
  const idParse = userIdSchema.safeParse(userId);
  if (!idParse.success) {
    return { ok: false, message: "Invalid user id" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ is_active: true })
    .eq("id", idParse.data);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/users/employees");
  revalidatePath("/employees");
  return { ok: true };
}
