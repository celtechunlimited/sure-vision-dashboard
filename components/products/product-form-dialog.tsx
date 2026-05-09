"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createProduct,
  updateProduct,
} from "@/lib/actions/product-actions";
import type { ProductCategory, ProductInventoryRow } from "@/lib/products/types";
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
} from "@/lib/products/types";
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

type FormState = {
  long_name: string;
  short_name: string;
  sku: string;
  category: ProductCategory | "";
  description: string;
  unit_price: string;
  low_stock_threshold: string;
};

function emptyFormState(): FormState {
  return {
    long_name: "",
    short_name: "",
    sku: "",
    category: "",
    description: "",
    unit_price: "",
    low_stock_threshold: "",
  };
}

function productToFormState(p: ProductInventoryRow): FormState {
  return {
    long_name: p.long_name ?? "",
    short_name: p.short_name ?? "",
    sku: p.sku ?? "",
    category: (p.category ?? "") as ProductCategory | "",
    description: p.description ?? "",
    unit_price:
      p.unit_price !== null && p.unit_price !== undefined && p.unit_price !== ""
        ? String(p.unit_price)
        : "",
    low_stock_threshold:
      p.low_stock_threshold != null ? String(p.low_stock_threshold) : "",
  };
}

export type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  product: ProductInventoryRow | null;
  defaultBranchId: string | null;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  product,
  defaultBranchId,
}: ProductFormDialogProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(emptyFormState);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && product) {
      setForm(productToFormState(product));
    } else {
      setForm(emptyFormState());
    }
  }, [open, mode, product]);

  function handleCancel() {
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "create" && !defaultBranchId) {
      toast.error("Select a branch before adding a product");
      return;
    }

    const payload = {
      long_name: form.long_name,
      short_name: form.short_name,
      sku: form.sku,
      category: form.category,
      description: form.description,
      unit_price: form.unit_price,
      low_stock_threshold: form.low_stock_threshold,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProduct(defaultBranchId, payload)
          : product
            ? await updateProduct(product.id, payload)
            : { ok: false as const, message: "No product selected" };

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(mode === "create" ? "Product created" : "Product updated");
      onOpenChange(false);
      router.refresh();
    });
  }

  const title = mode === "create" ? "Add product" : "Edit product";
  const description =
    mode === "create"
      ? "Enter product details. Status defaults to active."
      : "Update product details.";

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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="product-long-name">Name</Label>
            <Input
              id="product-long-name"
              value={form.long_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, long_name: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="product-short-name">Short name</Label>
              <Input
                id="product-short-name"
                value={form.short_name}
                onChange={(e) =>
                  setForm((s) => ({ ...s, short_name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-sku">SKU</Label>
              <Input
                id="product-sku"
                value={form.sku}
                onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-category">Category</Label>
            <Select
              value={form.category || "__none__"}
              onValueChange={(v) =>
                setForm((s) => ({
                  ...s,
                  category: v === "__none__" ? "" : (v as ProductCategory),
                }))
              }
            >
              <SelectTrigger id="product-category" size="default">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">None</SelectItem>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PRODUCT_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-description">Description</Label>
            <Input
              id="product-description"
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="product-unit-price">Unit price</Label>
              <Input
                id="product-unit-price"
                type="number"
                min={0}
                step="0.01"
                value={form.unit_price}
                onChange={(e) =>
                  setForm((s) => ({ ...s, unit_price: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-low">Low stock threshold</Label>
              <Input
                id="product-low"
                type="number"
                min={0}
                step={1}
                value={form.low_stock_threshold}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    low_stock_threshold: e.target.value,
                  }))
                }
              />
            </div>
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
