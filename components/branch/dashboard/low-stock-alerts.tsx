import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProductCategory, ProductInventoryRow } from "@/lib/products/types";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/products/types";

function categoryLabel(c: ProductCategory | string | null): string {
  if (!c) return "—";
  if (c in PRODUCT_CATEGORY_LABELS) {
    return PRODUCT_CATEGORY_LABELS[c as ProductCategory];
  }
  return String(c).replace(/_/g, " ");
}

export function LowStockAlerts({ products }: { products: ProductInventoryRow[] }) {
  const sorted = [...products].sort((a, b) => {
    const ao = a.stock_status === "out_of_stock" ? 0 : 1;
    const bo = b.stock_status === "out_of_stock" ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return a.current_stock - b.current_stock;
  });

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardHeader>
        <CardTitle>Low stock alerts</CardTitle>
        <CardDescription>
          At or below threshold · action required
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No low-stock or out-of-stock products.
          </p>
        ) : (
          sorted.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {p.short_name ?? p.long_name ?? "—"}
                </div>
                <div className="truncate text-muted-foreground">
                  {p.sku ?? "—"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {categoryLabel(p.category)}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    p.stock_status === "out_of_stock"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-50"
                  }
                >
                  {p.current_stock}
                  {p.low_stock_threshold != null
                    ? ` / ${p.low_stock_threshold}`
                    : ""}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
