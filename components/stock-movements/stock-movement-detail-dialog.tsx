"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { StockMovementLineRow } from "@/lib/stock-movements/types";
import { MOVEMENT_TYPE_LABELS } from "@/lib/stock-movements/types";
import {
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@/lib/products/types";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatMoney(value: string | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function uuidOrDash(id: string | null | undefined): string {
  if (!id) return "—";
  return id;
}

function movementLabel(t: string): string {
  return MOVEMENT_TYPE_LABELS[t] ?? t;
}

function categoryLabel(c: string | null): string {
  if (!c) return "—";
  const k = c as ProductCategory;
  return PRODUCT_CATEGORY_LABELS[k] ?? c;
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-foreground text-xs font-normal">
        {label}
      </Label>
      <div
        className={cn(
          "text-sm",
          mono && "font-mono text-xs break-all",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export type StockMovementDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: StockMovementLineRow | null;
};

export function StockMovementDetailDialog({
  open,
  onOpenChange,
  row,
}: StockMovementDetailDialogProps) {
  const title = row
    ? movementLabel(String(row.movement_type))
    : "Movement";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {row
              ? `Recorded ${formatDate(row.created_at)}`
              : "Movement details"}
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="mb-3 text-sm font-medium">Movement</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Movement ID" value={row.id} mono />
                <DetailField
                  label="Type"
                  value={
                    <Badge variant="outline" className="font-normal">
                      {movementLabel(String(row.movement_type))}
                    </Badge>
                  }
                />
                <DetailField
                  label="Quantity"
                  value={
                    <span className="tabular-nums font-medium">
                      {row.quantity ?? "—"}
                    </span>
                  }
                />
                <DetailField
                  label="Branch ID"
                  value={uuidOrDash(row.branch_id)}
                  mono
                />
                <DetailField
                  label="Product ID"
                  value={uuidOrDash(row.product_id)}
                  mono
                />
                <DetailField
                  label="Appointment ID"
                  value={uuidOrDash(row.appointment_id)}
                  mono
                />
                <DetailField
                  label="Performed by (employee ID)"
                  value={uuidOrDash(row.performed_by)}
                  mono
                />
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-muted-foreground text-xs font-normal">
                    Notes
                  </Label>
                  <p className="text-sm whitespace-pre-wrap">
                    {row.notes?.trim() ? row.notes : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="mb-3 text-sm font-medium">Product</p>
              {!row.product_id ? (
                <p className="text-muted-foreground text-sm">
                  No product linked to this movement.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField
                    label="Name"
                    value={
                      row.product_long_name ??
                      row.product_short_name ??
                      "—"
                    }
                  />
                  <DetailField
                    label="Short name"
                    value={row.product_short_name ?? "—"}
                  />
                  <DetailField
                    label="SKU"
                    value={
                      <span className="font-mono text-xs">
                        {row.product_sku ?? "—"}
                      </span>
                    }
                  />
                  <DetailField
                    label="Category"
                    value={categoryLabel(row.product_category as string)}
                  />
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label className="text-muted-foreground text-xs font-normal">
                      Description
                    </Label>
                    <p className="text-sm whitespace-pre-wrap">
                      {row.product_description?.trim()
                        ? row.product_description
                        : "—"}
                    </p>
                  </div>
                  <DetailField
                    label="Unit price"
                    value={formatMoney(row.product_unit_price)}
                  />
                  <DetailField
                    label="Product active"
                    value={
                      row.product_is_active == null ? (
                        "—"
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          {row.product_is_active ? "Yes" : "No"}
                        </Badge>
                      )
                    }
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
