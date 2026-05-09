"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBranchesForSwitcher } from "@/lib/actions/branch-actions";
import type { BranchMutationResult } from "@/lib/branches/branch-form";
import { createClient } from "@/lib/supabase/server";

const productCategoryEnum = z.enum([
  "frames",
  "solutions",
  "contact_lens",
  "lens",
  "accessory",
  "other",
]);

const productFormSchema = z.object({
  long_name: z.string().trim().min(1, "Name is required"),
  short_name: z
    .string()
    .trim()
    .optional()
    .transform((s) => (!s ? null : s)),
  sku: z
    .string()
    .trim()
    .optional()
    .transform((s) => (!s ? null : s)),
  category: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      const t = (val ?? "").trim();
      if (!t) return;
      if (!productCategoryEnum.safeParse(t).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid category",
        });
      }
    })
    .transform((val) => {
      const t = (val ?? "").trim();
      if (!t) return null;
      const p = productCategoryEnum.safeParse(t);
      return p.success ? p.data : null;
    }),
  description: z
    .string()
    .trim()
    .optional()
    .transform((s) => (!s ? null : s)),
  unit_price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().nonnegative().nullable(),
  ),
  low_stock_threshold: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().int().nonnegative().nullable(),
  ),
});

export type ProductFormPayload = z.infer<typeof productFormSchema>;

async function assertBranchAllowed(
  branchId: string | null | undefined,
): Promise<{ ok: true; branchId: string } | { ok: false; message: string }> {
  const idParse = z.string().uuid().safeParse(branchId);
  if (!idParse.success) {
    return { ok: false, message: "A branch is required" };
  }
  const { branches } = await getBranchesForSwitcher();
  const allowed = new Set(branches.map((b) => b.id));
  if (!allowed.has(idParse.data)) {
    return { ok: false, message: "You cannot manage products for that branch" };
  }
  return { ok: true, branchId: idParse.data };
}

export async function createProduct(
  branchId: string | null,
  input: unknown,
): Promise<BranchMutationResult> {
  const branchCheck = await assertBranchAllowed(branchId);
  if (!branchCheck.ok) return branchCheck;

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid form data" };
  }
  const f = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    branch_id: branchCheck.branchId,
    long_name: f.long_name,
    short_name: f.short_name,
    sku: f.sku,
    category: f.category,
    description: f.description,
    unit_price: f.unit_price,
    low_stock_threshold: f.low_stock_threshold,
    is_active: true,
  });

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/inventory/products");
  return { ok: true };
}

export async function updateProduct(
  productId: string,
  input: unknown,
): Promise<BranchMutationResult> {
  const idParse = z.string().uuid().safeParse(productId);
  if (!idParse.success) {
    return { ok: false, message: "Invalid product" };
  }

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid form data" };
  }
  const f = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      long_name: f.long_name,
      short_name: f.short_name,
      sku: f.sku,
      category: f.category,
      description: f.description,
      unit_price: f.unit_price,
      low_stock_threshold: f.low_stock_threshold,
    })
    .eq("id", idParse.data)
    .select("id");

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }
  if (!data?.length) {
    return { ok: false, message: "Product not found or not permitted" };
  }

  revalidatePath("/inventory/products");
  return { ok: true };
}

export async function setProductActive(
  productId: string,
  isActive: boolean,
): Promise<BranchMutationResult> {
  const idParse = z.string().uuid().safeParse(productId);
  if (!idParse.success) {
    return { ok: false, message: "Invalid product" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", idParse.data)
    .select("id");

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }
  if (!data?.length) {
    return { ok: false, message: "Product not found or not permitted" };
  }

  revalidatePath("/inventory/products");
  return { ok: true };
}

const movementEnum = z.enum(["in", "out", "adjustment"]);

const stockMovementSchema = z.object({
  product_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  movement_type: movementEnum,
  quantity: z.coerce.number(),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((s) => (!s ? null : s)),
});

export async function createStockMovement(
  input: unknown,
): Promise<BranchMutationResult> {
  const parsed = stockMovementSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message: msg || "Invalid movement" };
  }
  const row = parsed.data;

  const branchCheck = await assertBranchAllowed(row.branch_id);
  if (!branchCheck.ok) return branchCheck;

  const supabase = await createClient();
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, branch_id")
    .eq("id", row.product_id)
    .maybeSingle();

  if (pErr) {
    console.error(pErr);
    return { ok: false, message: pErr.message };
  }
  if (!product || product.branch_id !== branchCheck.branchId) {
    return { ok: false, message: "Product does not belong to that branch" };
  }

  let qty = row.quantity;
  if (row.movement_type === "in" || row.movement_type === "out") {
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return { ok: false, message: "Quantity must be a positive whole number" };
    }
  } else {
    if (!Number.isFinite(qty) || qty === 0 || !Number.isInteger(qty)) {
      return {
        ok: false,
        message: "Adjustment quantity must be a non-zero whole number",
      };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let performedBy: string | null = null;
  if (user) {
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    performedBy = emp?.id ?? null;
  }

  const { error } = await supabase.from("stock_movements").insert({
    product_id: row.product_id,
    branch_id: branchCheck.branchId,
    movement_type: row.movement_type,
    quantity: qty,
    notes: row.notes,
    performed_by: performedBy,
  });

  if (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/inventory/products");
  revalidatePath("/inventory/stock-movements");
  return { ok: true };
}
