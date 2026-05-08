"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const assignSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid().nullable(),
});

export async function assignEmployeeBranch(
  input: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ branch_id: parsed.data.branchId })
    .eq("id", parsed.data.userId);

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/users/employees");
  return { ok: true };
}
