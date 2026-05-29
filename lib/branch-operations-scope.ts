import { cookies } from "next/headers";
import { z } from "zod";

import { getBranchesForSwitcher } from "@/lib/actions/branch-actions";
import type { BranchRow } from "@/lib/branches/types";

/** Cookie used so branch-operation server queries match the sidebar branch switcher. */
export const BRANCH_OPERATIONS_COOKIE = "optical-dashboard-branch-ops";

export type BranchOperationsScope = {
  /** Resolved branch for branch-operation pages; null if user has no operable branches. */
  branchId: string | null;
  /** Same branch list as the switcher (used for labels / allowed validation). */
  switcherBranches: BranchRow[];
};

/**
 * Resolves which branch branch-operation pages should use: validated cookie if set,
 * otherwise the same default ordering as `BranchSwitcher` (user branch when fixed,
 * else first active branch for super admins).
 */
export async function resolveBranchOperationsScope(): Promise<BranchOperationsScope> {
  const { branches, userBranchIds } = await getBranchesForSwitcher();
  const ids = new Set(branches.map((b) => b.id));

  if (branches.length === 0) {
    return { branchId: null, switcherBranches: [] };
  }

  const raw = (await cookies()).get(BRANCH_OPERATIONS_COOKIE)?.value;
  const cookieId = z.string().uuid().safeParse(raw).success ? raw! : null;
  if (cookieId && ids.has(cookieId)) {
    return { branchId: cookieId, switcherBranches: branches };
  }

  const defaultId =
    userBranchIds.find((id) => ids.has(id)) ?? branches[0]!.id;
  return { branchId: defaultId, switcherBranches: branches };
}
