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
    return { branches: [], userBranchId: null, canSwitchBranches: false };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("branch_id, user_type")
    .eq("id", user.id)
    .maybeSingle();

  const userBranchId = profile?.branch_id ?? null;
  const canSwitchBranches = profile?.user_type === "super_admin";

  if (canSwitchBranches) {
    const { data: branchRows, error: branchesError } = await supabase
      .from("branches")
      .select("id, short_name, long_name")
      .eq("is_active", true)
      .order("short_name", { ascending: true });

    if (branchesError) {
      console.error(branchesError);
      return { branches: [], userBranchId, canSwitchBranches: true };
    }

    return {
      branches: branchRows ?? [],
      userBranchId,
      canSwitchBranches: true,
    };
  }

  if (!userBranchId) {
    return { branches: [], userBranchId: null, canSwitchBranches: false };
  }

  const { data: assignedBranch, error: oneError } = await supabase
    .from("branches")
    .select("id, short_name, long_name")
    .eq("id", userBranchId)
    .eq("is_active", true)
    .maybeSingle();

  if (oneError) {
    console.error(oneError);
    return { branches: [], userBranchId, canSwitchBranches: false };
  }

  return {
    branches: assignedBranch ? [assignedBranch] : [],
    userBranchId,
    canSwitchBranches: false,
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
