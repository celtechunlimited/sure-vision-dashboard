"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createPatientRecord,
  updatePatientRecord,
} from "@/lib/actions/patient-actions";
import type { PatientDirectoryRow } from "@/lib/patients/types";
import type { EmployeeBranchOption } from "@/lib/employees/types";
import { BranchMultiSelect } from "@/components/branches/branch-multi-select";
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

type FormState = {
  first_name: string;
  middle_name: string;
  last_name: string;
  contact_number: string;
  date_of_birth: string;
  address: string;
  branchIds: string[];
};

function emptyFormState(): FormState {
  return {
    first_name: "",
    middle_name: "",
    last_name: "",
    contact_number: "",
    date_of_birth: "",
    address: "",
    branchIds: [],
  };
}

function rowToForm(row: PatientDirectoryRow): FormState {
  return {
    first_name: row.first_name?.trim() ?? "",
    middle_name: row.middle_name?.trim() ?? "",
    last_name: row.last_name?.trim() ?? "",
    contact_number: row.contact_number?.trim() ?? "",
    date_of_birth: row.date_of_birth ?? "",
    address: row.address?.trim() ?? "",
    branchIds: row.branch_ids ?? [],
  };
}

export type PatientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  row: PatientDirectoryRow | null;
  variant?: "admin" | "branch";
  branches?: EmployeeBranchOption[];
  autoAssignBranchId?: string | null;
  autoAssignBranchLabel?: string | null;
};

export function PatientFormDialog({
  open,
  onOpenChange,
  mode,
  row,
  variant = "admin",
  branches = [],
  autoAssignBranchId = null,
  autoAssignBranchLabel = null,
}: PatientFormDialogProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(emptyFormState);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && row) {
      setForm(rowToForm(row));
    } else {
      setForm({
        ...emptyFormState(),
        branchIds: autoAssignBranchId ? [autoAssignBranchId] : [],
      });
    }
  }, [open, mode, row, autoAssignBranchId]);

  function handleCancel() {
    if (pending) return;
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = {
      first_name: form.first_name,
      middle_name: form.middle_name.trim() === "" ? null : form.middle_name,
      last_name: form.last_name,
      contact_number:
        form.contact_number.trim() === "" ? null : form.contact_number,
      date_of_birth: form.date_of_birth.trim() === "" ? null : form.date_of_birth,
      address: form.address.trim() === "" ? null : form.address,
    };

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createPatientRecord({
              ...payload,
              branchIds:
                variant === "branch" && autoAssignBranchId
                  ? [autoAssignBranchId]
                  : form.branchIds,
            })
          : row
            ? await updatePatientRecord({ patientId: row.patient_id, ...payload })
            : { ok: false as const, message: "No patient selected" };

      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(mode === "create" ? "Patient created" : "Patient updated");
      onOpenChange(false);
      router.refresh();
    });
  }

  const title = mode === "create" ? "Add patient" : "Edit patient";
  const description =
    mode === "create"
      ? variant === "branch"
        ? "Create a patient record assigned to the current branch."
        : "Create a patient record and assign branches."
      : "Update patient profile details. Account email is shown for reference only.";

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
          {mode === "edit" && row?.email ? (
            <div className="grid gap-2">
              <Label>Account email</Label>
              <Input value={row.email} readOnly className="bg-muted" />
            </div>
          ) : null}
          {mode === "create" && variant === "branch" && autoAssignBranchLabel ? (
            <p className="text-sm text-muted-foreground">
              Will be assigned to:{" "}
              <span className="font-medium text-foreground">
                {autoAssignBranchLabel}
              </span>
            </p>
          ) : null}
          {mode === "create" && variant === "admin" ? (
            <div className="grid gap-2">
              <Label htmlFor="patient-branches">Branches</Label>
              <BranchMultiSelect
                id="patient-branches"
                branches={branches}
                value={form.branchIds}
                onChange={(branchIds) =>
                  setForm((s) => ({ ...s, branchIds }))
                }
                placeholder="Select branches"
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="patient-first-name">First name</Label>
            <Input
              id="patient-first-name"
              value={form.first_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, first_name: e.target.value }))
              }
              required
              autoComplete="given-name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="patient-middle-name">Middle name</Label>
            <Input
              id="patient-middle-name"
              value={form.middle_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, middle_name: e.target.value }))
              }
              autoComplete="additional-name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="patient-last-name">Last name</Label>
            <Input
              id="patient-last-name"
              value={form.last_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, last_name: e.target.value }))
              }
              required
              autoComplete="family-name"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="patient-contact">Contact number</Label>
              <Input
                id="patient-contact"
                value={form.contact_number}
                onChange={(e) =>
                  setForm((s) => ({ ...s, contact_number: e.target.value }))
                }
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="patient-dob">Date of birth</Label>
              <Input
                id="patient-dob"
                type="date"
                value={form.date_of_birth}
                onChange={(e) =>
                  setForm((s) => ({ ...s, date_of_birth: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="patient-address">Address</Label>
            <Input
              id="patient-address"
              value={form.address}
              onChange={(e) =>
                setForm((s) => ({ ...s, address: e.target.value }))
              }
              autoComplete="street-address"
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
            <Button
              type="submit"
              disabled={pending || (mode === "edit" && !row)}
            >
              {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
