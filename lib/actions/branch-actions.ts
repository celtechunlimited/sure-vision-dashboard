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
};

export async function getBranchesForSwitcher(): Promise<BranchesForSwitcher> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { branches: [], userBranchId: null };
  }

  const { data: branchRows, error: branchesError } = await supabase
    .from("branches")
    .select("id, short_name, long_name")
    .eq("is_active", true)
    .order("short_name", { ascending: true });

  if (branchesError) {
    console.error(branchesError);
    return { branches: [], userBranchId: null };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("branch_id")
    .eq("id", user.id)
    .maybeSingle();

  return {
    branches: branchRows ?? [],
    userBranchId: profile?.branch_id ?? null,
  };
}
