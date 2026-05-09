"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { getBranchesForSwitcher } from "@/lib/actions/branch-actions";
import { BRANCH_OPERATIONS_COOKIE } from "@/lib/branch-operations-scope";
import { createClient } from "@/lib/supabase/server";

/**
 * Persists the branch switcher selection for server components on branch-operation routes.
 * Ignores ids the signed-in user is not allowed to operate under.
 */
export async function syncBranchOperationsCookie(
  branchId: string,
): Promise<{ ok: boolean }> {
  const idParse = z.string().uuid().safeParse(branchId);
  if (!idParse.success) {
    return { ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false };
  }

  const { branches } = await getBranchesForSwitcher();
  const allowed = new Set(branches.map((b) => b.id));
  if (!allowed.has(idParse.data)) {
    return { ok: false };
  }

  const jar = await cookies();
  jar.set(BRANCH_OPERATIONS_COOKIE, idParse.data, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
  });

  return { ok: true };
}
