"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createStockMovement } from "@/lib/actions/product-actions";
import type { ProductInventoryRow } from "@/lib/products/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MOVEMENT_OPTIONS = [
  { value: "in", label: "Stock in" },
  { value: "out", label: "Stock out" },
  { value: "adjustment", label: "Adjustment" },
] as const;

function stockStatusLabel(s: ProductInventoryRow["stock_status"]): string {
  if (s === "in_stock") return "In stock";
  if (s === "low_stock") return "Low stock";
  return "Out of stock";
}

export type StockMovementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductInventoryRow | null;
};

export function StockMovementDialog({
  open,
  onOpenChange,
  product,
}: StockMovementDialogProps) {
  const router = useRouter();
  const [movementType, setMovementType] = React.useState<
    "in" | "out" | "adjustment"
  >("in");
  const [quantity, setQuantity] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    setMovementType("in");
    setQuantity("");
    setNotes("");
  }, [open, product?.id]);

  function handleCancel() {
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product?.id || !product.branch_id) {
      toast.error("Product or branch is missing");
      return;
    }

    startTransition(async () => {
      const result = await createStockMovement({
        product_id: product.id,
        branch_id: product.branch_id,
        movement_type: movementType,
        quantity,
        notes,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Stock movement recorded");
      onOpenChange(false);
      router.refresh();
    });
  }

  const name =
    product?.long_name ?? product?.short_name ?? "this product";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!pending}
        onPointerDownOutside={(e) => {
          if (pending) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Create movement</DialogTitle>
          <DialogDescription>
            Record a stock change for “{name}”.
            {movementType === "adjustment"
              ? " Use positive or negative whole numbers for adjustments."
              : " Use a positive whole number."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {product ? (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                <div className="grid gap-1">
                  <span className="text-muted-foreground">Current stock</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {product.current_stock}
                  </span>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground">Stock status</span>
                  <div>
                    <Badge
                      variant="outline"
                      className="gap-1.5 font-normal"
                      aria-live="polite"
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          product.stock_status === "in_stock" &&
                            "bg-emerald-500",
                          product.stock_status === "low_stock" &&
                            "bg-amber-500",
                          product.stock_status === "out_of_stock" &&
                            "bg-red-500",
                        )}
                      />
                      {stockStatusLabel(product.stock_status)}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground">
                    Low stock threshold
                  </span>
                  <span className="text-lg font-semibold tabular-nums">
                    {product.low_stock_threshold != null
                      ? product.low_stock_threshold
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="sm-type">Movement type</Label>
            <Select
              value={movementType}
              onValueChange={(v) =>
                setMovementType(v as "in" | "out" | "adjustment")
              }
            >
              <SelectTrigger id="sm-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {MOVEMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sm-qty">Quantity</Label>
            <Input
              id="sm-qty"
              type="number"
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sm-notes">Notes (optional)</Label>
            <Input
              id="sm-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="space-x-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
