import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProductCategory, ProductStockStatus } from "@/lib/products/types";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/products/types";

type SnapshotRow = {
  category: ProductCategory | string | null;
  total: number;
  inStock: number;
  lowStock: number;
  outStock: number;
};

function buildSnapshot(
  rows: {
    category: ProductCategory | string | null;
    stock_status: ProductStockStatus | string;
  }[],
): SnapshotRow[] {
  const map = new Map<string, SnapshotRow>();

  for (const r of rows) {
    const key = String(r.category ?? "other");
    let cur = map.get(key);
    if (!cur) {
      cur = {
        category: r.category,
        total: 0,
        inStock: 0,
        lowStock: 0,
        outStock: 0,
      };
      map.set(key, cur);
    }
    cur.total += 1;
    if (r.stock_status === "in_stock") cur.inStock += 1;
    else if (r.stock_status === "low_stock") cur.lowStock += 1;
    else if (r.stock_status === "out_of_stock") cur.outStock += 1;
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

function categoryLabel(c: ProductCategory | string | null): string {
  if (!c) return "—";
  if (c in PRODUCT_CATEGORY_LABELS) {
    return PRODUCT_CATEGORY_LABELS[c as ProductCategory];
  }
  return String(c).replace(/_/g, " ");
}

export function InventorySnapshot({
  categoryRows,
}: {
  categoryRows: {
    category: ProductCategory | string | null;
    stock_status: ProductStockStatus | string;
  }[];
}) {
  const snapshot = buildSnapshot(categoryRows);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory snapshot</CardTitle>
        <CardDescription>
          Active products by category · stock health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {snapshot.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active products.</p>
        ) : (
          snapshot.map((row) => {
            const pct =
              row.total > 0 ? Math.round((row.inStock / row.total) * 100) : 0;
            const barClass = row.outStock > 0
              ? "bg-destructive"
              : row.lowStock > 0
                ? "bg-amber-500"
                : "bg-emerald-600";

            return (
              <div key={String(row.category)} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {categoryLabel(row.category)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.total} SKU
                    {row.total === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-[width]", barClass)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>In stock: {row.inStock}</span>
                  {row.lowStock > 0 ? <span>Low: {row.lowStock}</span> : null}
                  {row.outStock > 0 ? (
                    <span className="text-destructive">Out: {row.outStock}</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
