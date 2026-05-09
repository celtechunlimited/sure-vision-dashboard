"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ProductInventoryRow } from "@/lib/products/types";
import { cn } from "@/lib/utils";

function productLabel(p: ProductInventoryRow): string {
  return p.long_name ?? p.short_name ?? p.sku ?? p.id;
}

export type ProductComboboxProps = {
  products: ProductInventoryRow[];
  valueProductId: string | null;
  onSelectProduct: (product: ProductInventoryRow | null) => void;
  disabled?: boolean;
};

export function ProductCombobox({
  products,
  valueProductId,
  onSelectProduct,
  disabled,
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => products.find((p) => p.id === valueProductId) ?? null,
    [products, valueProductId],
  );

  const label = selected ? productLabel(selected) : "Select product…";

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-8 w-full min-w-[140px] justify-between px-2 font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,320px)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search products…" />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => {
                const name = productLabel(p);
                const searchBlob = [
                  name,
                  p.sku ?? "",
                  p.id,
                  p.category ?? "",
                ]
                  .join(" ")
                  .toLowerCase();
                return (
                  <CommandItem
                    key={p.id}
                    value={searchBlob}
                    onSelect={() => {
                      onSelectProduct(p);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{name}</span>
                    <Check
                      className={cn(
                        "ml-auto size-4 shrink-0",
                        valueProductId === p.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
