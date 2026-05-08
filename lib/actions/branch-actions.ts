"use server";

import { createClient } from "@/lib/supabase/server";

export type BranchRow = {
  id: string;
  short_name: string;
  long_name: string;
};

export type BranchesForSwitcher = {
  branches: BranchRow[];
  userBranchId: string | null;
  /** Only `super_admin` may switch branches; employees use `users.branch_id`. */
  canSwitchBranches: boolean;
};

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
