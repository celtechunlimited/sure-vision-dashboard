"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseBranchForm } from "@/lib/branches/branch-form";
import type { BranchMutationResult } from "@/lib/branches/branch-form";
import type {
  BranchAdminRow,
  BranchesForSwitcher,
} from "@/lib/branches/types";
import { createClient } from "@/lib/supabase/server";

export async function getBranchesForSwitcher(): Promise<BranchesForSwitcher> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { branches: [], userBranchIds: [], canSwitchBranches: false };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.user_type === "super_admin") {
    const { data: branchRows, error: branchesError } = await supabase
      .from("branches")
      .select("id, short_name, long_name")
      .eq("is_active", true)
      .order("short_name", { ascending: true });

    if (branchesError) {
      console.error(branchesError);
      return { branches: [], userBranchIds: [], canSwitchBranches: false };
    }

    const branches = branchRows ?? [];
    return {
      branches,
      userBranchIds: branches.map((b) => b.id),
      canSwitchBranches: branches.length > 1,
    };
  }

  if (profile?.user_type !== "employee") {
    return { branches: [], userBranchIds: [], canSwitchBranches: false };
  }

  const { data: myEmployee, error: employeeError } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (employeeError || !myEmployee?.id) {
    if (employeeError) console.error(employeeError);
    return { branches: [], userBranchIds: [], canSwitchBranches: false };
  }

  const { data: assignments, error: assignError } = await supabase
    .from("employee_branches")
    .select("branch:branches!inner(id, short_name, long_name, is_active)")
    .eq("employee_id", myEmployee.id);

  if (assignError) {
    console.error(assignError);
    return { branches: [], userBranchIds: [], canSwitchBranches: false };
  }

  type AssignmentRow = {
    branch:
      | { id: string; short_name: string; long_name: string; is_active: boolean }
      | { id: string; short_name: string; long_name: string; is_active: boolean }[]
      | null;
  };

  const branches = ((assignments ?? []) as AssignmentRow[])
    .flatMap((r) => (Array.isArray(r.branch) ? r.branch : r.branch ? [r.branch] : []))
    .filter((b) => b.is_active)
    .sort((a, b) => a.short_name.localeCompare(b.short_name))
    .map(({ id, short_name, long_name }) => ({ id, short_name, long_name }));

  const userBranchIds = branches.map((b) => b.id);
  return {
    branches,
    userBranchIds,
    canSwitchBranches: branches.length > 1,
  };
}

export async function listBranchesForAdmin(): Promise<BranchAdminRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select(
      "id, created_at, long_name, short_name, address, contact_number, contact_email, operating_hours, appointment_slot_duration, is_active",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []) as BranchAdminRow[];
}

export async function createBranch(
  input: unknown,
): Promise<BranchMutationResult> {
  const parsed = parseBranchForm(input);
  if (!parsed.ok || !parsed.data) return parsed;

  const { fields, operating_hours } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("branches").insert({
    long_name: fields.long_name,
    short_name: fields.short_name,
    address: fields.address,
    contact_number: fields.contact_number,
    contact_email: fields.contact_email,
    operating_hours,
    appointment_slot_duration: fields.appointment_slot_duration,
  });

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/branches");
  return { ok: true };
}

export async function updateBranch(
  id: string,
  input: unknown,
): Promise<BranchMutationResult> {
  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return { ok: false, message: "Invalid branch id" };
  }

  const parsed = parseBranchForm(input);
  if (!parsed.ok || !parsed.data) return parsed;

  const { fields, operating_hours } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({
      long_name: fields.long_name,
      short_name: fields.short_name,
      address: fields.address,
      contact_number: fields.contact_number,
      contact_email: fields.contact_email,
      operating_hours,
      appointment_slot_duration: fields.appointment_slot_duration,
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/branches");
  return { ok: true };
}

export async function deactivateBranch(
  id: string,
): Promise<BranchMutationResult> {
  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return { ok: false, message: "Invalid branch id" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/branches");
  return { ok: true };
}

export async function activateBranch(
  id: string,
): Promise<BranchMutationResult> {
  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return { ok: false, message: "Invalid branch id" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({ is_active: true })
    .eq("id", id);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/branches");
  return { ok: true };
}
