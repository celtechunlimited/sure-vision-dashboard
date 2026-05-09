import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BranchRow } from "@/lib/branches/types";
import type { ProductCategory, ProductInventoryRow } from "@/lib/products/types";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/products/types";

export type LowStockInventoryRow = Pick<
  ProductInventoryRow,
  | "id"
  | "branch_id"
  | "short_name"
  | "sku"
  | "category"
  | "current_stock"
  | "low_stock_threshold"
  | "stock_status"
>;

function categoryLabel(c: ProductCategory | string | null): string {
  if (!c) return "—";
  if (c in PRODUCT_CATEGORY_LABELS) {
    return PRODUCT_CATEGORY_LABELS[c as ProductCategory];
  }
  return String(c).replace(/_/g, " ");
}

export function InventoryAlertsByBranch({
  branches,
  lowStockRows,
}: {
  branches: BranchRow[];
  lowStockRows: LowStockInventoryRow[];
}) {
  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const byBranch = new Map<string | null, LowStockInventoryRow[]>();

  for (const row of lowStockRows) {
    const bid = row.branch_id;
    const list = byBranch.get(bid) ?? [];
    list.push(row);
    byBranch.set(bid, list);
  }

  const sortedBranchIds = [...byBranch.keys()].sort((a, b) => {
    const na = a ? (branchMap.get(a)?.short_name ?? a) : "";
    const nb = b ? (branchMap.get(b)?.short_name ?? b) : "";
    return na.localeCompare(nb);
  });

  if (sortedBranchIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory alerts</CardTitle>
          <CardDescription>
            Products at or below low-stock threshold, grouped by branch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No low-stock or out-of-stock products across active branches.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Cross-branch inventory alerts
        </h2>
        <p className="text-sm text-muted-foreground">
          Low stock and out-of-stock · active products only
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sortedBranchIds.map((branchId) => {
          const rows = byBranch.get(branchId) ?? [];
          const b = branchId ? branchMap.get(branchId) : null;
          const title = b?.long_name ?? b?.short_name ?? "Unknown branch";
          const outCount = rows.filter((r) => r.stock_status === "out_of_stock")
            .length;

          return (
            <Card
              key={branchId ?? "none"}
              className={
                outCount > 0
                  ? "border-l-4 border-l-destructive"
                  : "border-l-4 border-l-amber-500"
              }
            >
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{rows.length} SKU(s)</CardDescription>
                  </div>
                  {outCount > 0 ? (
                    <Badge variant="destructive">{outCount} out</Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-50"
                    >
                      Low only
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {rows
                  .slice()
                  .sort((a, b) => {
                    const ao = a.stock_status === "out_of_stock" ? 0 : 1;
                    const bo = b.stock_status === "out_of_stock" ? 0 : 1;
                    if (ao !== bo) return ao - bo;
                    return a.current_stock - b.current_stock;
                  })
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {r.short_name ?? "—"}
                        </div>
                        <div className="truncate text-muted-foreground">
                          {r.sku ?? "—"} · {categoryLabel(r.category)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-muted-foreground">
                          {r.current_stock}
                          {r.low_stock_threshold != null
                            ? ` / ${r.low_stock_threshold}`
                            : ""}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            r.stock_status === "out_of_stock"
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-50"
                          }
                        >
                          {r.stock_status === "out_of_stock"
                            ? "Out"
                            : "Low"}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
