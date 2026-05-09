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
import { patientDirectoryFullName } from "@/lib/appointments/patient-display";
import type { PatientDirectoryRow } from "@/lib/patients/types";
import { cn } from "@/lib/utils";

export type PatientComboboxProps = {
  patients: PatientDirectoryRow[];
  valuePatientId: string | null;
  onSelectPatient: (patient: PatientDirectoryRow | null) => void;
  disabled?: boolean;
};

export function PatientCombobox({
  patients,
  valuePatientId,
  onSelectPatient,
  disabled,
}: PatientComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => patients.find((p) => p.patient_id === valuePatientId) ?? null,
    [patients, valuePatientId],
  );

  const label = selected ? patientDirectoryFullName(selected) : "Search clients…";

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,var(--radix-popover-trigger-width))] max-w-lg p-0">
        <Command>
          <CommandInput placeholder="Search by name, email, phone…" />
          <CommandList>
            <CommandEmpty>No client found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onSelectPatient(null);
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground">No linked client (manual only)</span>
                <Check
                  className={cn(
                    "ml-auto size-4",
                    !valuePatientId ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
              {patients.map((p) => {
                const name = patientDirectoryFullName(p);
                const searchBlob = [
                  name,
                  p.patient_id,
                  p.email ?? "",
                  p.contact_number ?? "",
                ]
                  .join(" ")
                  .toLowerCase();
                return (
                  <CommandItem
                    key={p.patient_id}
                    value={searchBlob}
                    onSelect={() => {
                      onSelectPatient(p);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{name}</span>
                    <Check
                      className={cn(
                        "ml-auto size-4 shrink-0",
                        valuePatientId === p.patient_id ? "opacity-100" : "opacity-0",
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
