"use client";

import * as React from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type BranchMultiSelectOption = {
  id: string;
  short_name: string;
  long_name: string;
};

export type BranchMultiSelectProps = {
  branches: BranchMultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
};

export function BranchMultiSelect({
  branches,
  value,
  onChange,
  disabled = false,
  id,
  placeholder = "Select branches",
  className,
}: BranchMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(
    () => branches.filter((b) => value.includes(b.id)),
    [branches, value],
  );

  function toggle(branchId: string, checked: boolean) {
    if (checked) {
      onChange([...value, branchId]);
    } else {
      onChange(value.filter((id) => id !== branchId));
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-auto min-h-9 w-full justify-between font-normal",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1 py-0.5 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((b) => (
                <Badge key={b.id} variant="secondary" className="font-normal">
                  {b.short_name}
                </Badge>
              ))
            )}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2" align="start">
        <div className="max-h-60 space-y-1 overflow-auto">
          {branches.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No branches available.
            </p>
          ) : (
            branches.map((b) => {
              const checked = value.includes(b.id);
              return (
                <label
                  key={b.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-accent"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => toggle(b.id, next === true)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {b.long_name}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BranchChips({
  shortNames,
  longNames,
  className,
}: {
  shortNames: string[];
  longNames?: string[];
  className?: string;
}) {
  if (shortNames.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("flex max-w-[220px] flex-wrap gap-1", className)}>
      {shortNames.map((name, i) => (
        <Badge
          key={`${name}-${i}`}
          variant="outline"
          className="font-normal"
          title={longNames?.[i] ?? name}
        >
          {name}
        </Badge>
      ))}
    </div>
  );
}
