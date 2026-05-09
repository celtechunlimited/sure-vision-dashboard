import type { ProductCategory } from "@/lib/products/types";

export type StockMovementType =
  | "in"
  | "out"
  | "adjustment"
  | "dispensed";

/** Row shape for `public.stock_movement_lines` view. */
export type StockMovementLineRow = {
  id: string;
  created_at: string;
  product_id: string | null;
  branch_id: string | null;
  movement_type: StockMovementType | string;
  quantity: number | null;
  appointment_id: string | null;
  notes: string | null;
  performed_by: string | null;
  product_short_name: string | null;
  product_long_name: string | null;
  product_sku: string | null;
  product_category: ProductCategory | string | null;
  product_description: string | null;
  product_unit_price: string | null;
  product_is_active: boolean | null;
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Stock in",
  out: "Stock out",
  adjustment: "Adjustment",
  dispensed: "Dispensed",
};

export const MOVEMENT_TYPES: StockMovementType[] = [
  "in",
  "out",
  "adjustment",
  "dispensed",
];
