"use client";

import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

export type DispensedDashboardRow = {
  product_sku: string | null;
  product_name: string | null;
  quantity: number | null;
  created_at: string;
};

type WindowMode = "today" | "week";

function aggregateTop(
  rows: DispensedDashboardRow[],
  filter: (r: DispensedDashboardRow) => boolean,
  limit: number,
): { key: string; label: string; totalQty: number }[] {
  const map = new Map<string, { label: string; totalQty: number }>();
  for (const r of rows) {
    if (!filter(r)) continue;
    const sku = r.product_sku?.trim() ?? "";
    const name = r.product_name?.trim() ?? "";
    const key = sku || name || "__unknown__";
    const label = name || sku || "Unknown product";
    const qty = Number(r.quantity ?? 0);
    const prev = map.get(key);
    if (prev) prev.totalQty += qty;
    else map.set(key, { label, totalQty: qty });
  }
  return [...map.entries()]
    .sort((a, b) => b[1].totalQty - a[1].totalQty)
    .slice(0, limit)
    .map(([key, v]) => ({ key, label: v.label, totalQty: v.totalQty }));
}

export function TopDispensedProducts({
  dispensedRows,
  todayStartIso,
  todayEndIso,
}: {
  dispensedRows: DispensedDashboardRow[];
  todayStartIso: string;
  todayEndIso: string;
}) {
  const [mode, setMode] = React.useState<WindowMode>("today");

  const top = React.useMemo(() => {
    const t0 = new Date(todayStartIso).getTime();
    const t1 = new Date(todayEndIso).getTime();
    if (mode === "today") {
      return aggregateTop(
        dispensedRows,
        (r) => {
          const t = new Date(r.created_at).getTime();
          return !Number.isNaN(t) && t >= t0 && t < t1;
        },
        5,
      );
    }
    return aggregateTop(dispensedRows, () => true, 5);
  }, [dispensedRows, mode, todayEndIso, todayStartIso]);

  const maxQty = top[0]?.totalQty ?? 1;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Top dispensed products</CardTitle>
        <CardDescription>
          By line quantity · across all branches
        </CardDescription>
        <div className="flex flex-col gap-2 pt-2 @[540px]/card:flex-row @[540px]/card:items-center @[540px]/card:justify-end">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => {
              if (v === "today" || v === "week") setMode(v);
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[540px]/card:flex"
          >
            <ToggleGroupItem value="today">Today</ToggleGroupItem>
            <ToggleGroupItem value="week">This week</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={mode}
            onValueChange={(v) => {
              if (v === "today" || v === "week") setMode(v);
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-full @[540px]/card:hidden"
              aria-label="Time range"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No dispensed items in this period.
          </p>
        ) : (
          top.map((row, i) => (
            <div key={row.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium">
                  <span className="text-muted-foreground">{i + 1}. </span>
                  {row.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {row.totalQty}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{
                    width: `${Math.max(8, (row.totalQty / maxQty) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
