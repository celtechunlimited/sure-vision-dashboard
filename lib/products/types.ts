export type ProductCategory =
  | "frames"
  | "solutions"
  | "contact_lens"
  | "lens"
  | "accessory"
  | "other";

export type ProductStockStatus = "in_stock" | "low_stock" | "out_of_stock";

/** Row shape for `public.product_inventory` view. */
export type ProductInventoryRow = {
  id: string;
  created_at: string;
  branch_id: string | null;
  short_name: string | null;
  long_name: string | null;
  sku: string | null;
  category: ProductCategory | null;
  description: string | null;
  unit_price: string | null;
  low_stock_threshold: number | null;
  is_active: boolean | null;
  current_stock: number;
  stock_status: ProductStockStatus;
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  frames: "Frames",
  solutions: "Solutions",
  contact_lens: "Contact lens",
  lens: "Lens",
  accessory: "Accessory",
  other: "Other",
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "frames",
  "solutions",
  "contact_lens",
  "lens",
  "accessory",
  "other",
];
