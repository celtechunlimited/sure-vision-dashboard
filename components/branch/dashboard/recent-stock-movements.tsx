import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MOVEMENT_TYPE_LABELS } from "@/lib/stock-movements/types";
import type { StockMovementLineRow } from "@/lib/stock-movements/types";

function movementLabel(t: string): string {
  return MOVEMENT_TYPE_LABELS[t] ?? t;
}

function signedQuantity(
  type: string,
  qty: number | null,
): { text: string; className: string } {
  const n = qty ?? 0;
  if (type === "in") {
    return { text: `+${n}`, className: "text-emerald-600 dark:text-emerald-400" };
  }
  if (type === "out" || type === "dispensed") {
    return { text: `−${n}`, className: "text-destructive" };
  }
  return {
    text: n >= 0 ? `+${n}` : `${n}`,
    className: "text-muted-foreground",
  };
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function productLabel(row: StockMovementLineRow): string {
  return (
    row.product_long_name?.trim() ||
    row.product_short_name?.trim() ||
    row.product_sku?.trim() ||
    "—"
  );
}

export function RecentStockMovements({ rows }: { rows: StockMovementLineRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent stock movements</CardTitle>
        <CardDescription>Latest activity for this branch</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No movements yet.</p>
        ) : (
          rows.map((r) => {
            const qty = signedQuantity(String(r.movement_type), r.quantity);
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-2 text-sm last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{productLabel(r)}</div>
                  <div className="text-xs text-muted-foreground">
                    {movementLabel(String(r.movement_type))} ·{" "}
                    {relativeTime(r.created_at)}
                  </div>
                </div>
                <span
                  className={`shrink-0 tabular-nums text-sm font-semibold ${qty.className}`}
                >
                  {qty.text}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
